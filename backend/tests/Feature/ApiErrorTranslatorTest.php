<?php

namespace Tests\Feature;

use App\Support\ApiErrorTranslator;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PDOException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

/**
 * Locks in the behaviour that was missing: an API failure has to say what went wrong.
 *
 * The regression these guard against is real — on 2026-09-25 saving a lead showed only
 * "An unexpected server error occurred." for a permission problem, a duplicate value and a
 * blocked stage change alike, and left nothing in the log to tell them apart.
 */
class ApiErrorTranslatorTest extends TestCase
{
    private function apiRequest(string $method = 'PUT', string $path = 'api/leads/1'): Request
    {
        return Request::create('/'.$path, $method);
    }

    private function translate(\Throwable $e): array
    {
        $response = ApiErrorTranslator::make()->toResponse($e, $this->apiRequest());

        return [$response->getStatusCode(), $response->getData(true)];
    }

    public function test_a_denied_request_explains_the_denial_instead_of_reporting_a_server_error(): void
    {
        [$status, $body] = $this->translate(new AccessDeniedHttpException());

        $this->assertSame(403, $status);
        $this->assertSame('FORBIDDEN', $body['error']['code']);
        $this->assertStringContainsString('do not have access', $body['message']);
        $this->assertStringNotContainsString('unexpected', strtolower($body['message']));
        $this->assertArrayNotHasKey('reference', $body['error'], 'A routine refusal is not an incident and must not carry a reference code.');
    }

    public function test_a_developer_written_abort_message_is_preferred_over_the_default(): void
    {
        [, $body] = $this->translate(new AccessDeniedHttpException('Only the lead owner can close this deal.'));

        $this->assertSame('Only the lead owner can close this deal.', $body['message']);
    }

    public function test_a_missing_record_does_not_leak_the_model_class(): void
    {
        // This is the message Laravel builds for a failed route model binding.
        [$status, $body] = $this->translate(
            new NotFoundHttpException('No query results for model [App\Models\Lead] 512')
        );

        $this->assertSame(404, $status);
        $this->assertStringNotContainsString('App\Models', $body['message']);
        $this->assertStringContainsString('no longer exists', $body['message']);
    }

    public function test_validation_errors_name_the_field_instead_of_saying_the_data_was_invalid(): void
    {
        $e = ValidationException::withMessages([
            'website' => ['The website field must be a valid URL.'],
        ]);

        [$status, $body] = $this->translate($e);

        $this->assertSame(422, $status);
        $this->assertSame('The website field must be a valid URL.', $body['message']);
        $this->assertSame(['The website field must be a valid URL.'], $body['errors']['website']);
        $this->assertSame(['The website field must be a valid URL.'], $body['error']['details']['website']);
    }

    public function test_multiple_validation_errors_report_how_many_remain(): void
    {
        $e = ValidationException::withMessages([
            'website' => ['The website field must be a valid URL.'],
            'email' => ['The email field must be a valid email address.'],
            'lat' => ['The lat field must be a number.'],
        ]);

        [, $body] = $this->translate($e);

        $this->assertStringContainsString('and 2 other problems on this form', $body['message']);
    }

    public function test_a_duplicate_value_names_the_field_and_is_not_a_server_error(): void
    {
        $e = new QueryException(
            'pgsql',
            'insert into "leads" ...',
            [],
            new PDOException('SQLSTATE[23505]: Unique violation: 7 ERROR:  duplicate key value violates unique constraint "leads_email_unique"'.PHP_EOL.'DETAIL:  Key (email)=(a@b.com) already exists.')
        );
        // QueryException reads errorInfo off the wrapped PDOException; set it directly.
        $e->errorInfo = ['23505', 7, 'duplicate key value'];

        [$status, $body] = $this->translate($e);

        $this->assertSame(409, $status);
        $this->assertSame('DUPLICATE_VALUE', $body['error']['code']);
        $this->assertStringContainsString('Email', $body['message']);
        $this->assertStringNotContainsString('a@b.com', $body['message'], 'The submitted value must not be echoed back in the message.');
        $this->assertStringNotContainsString('leads_email_unique', $body['message'], 'Constraint names are internal.');
    }

    public function test_an_unknown_database_fault_stays_a_500_but_carries_a_reference_code(): void
    {
        $e = new QueryException('pgsql', 'select 1', [], new PDOException('SQLSTATE[42703]: Undefined column'));
        $e->errorInfo = ['42703', 7, 'undefined column "nope"'];

        [$status, $body] = $this->translate($e);

        $this->assertSame(500, $status);
        $this->assertStringNotContainsString('42703', $body['message']);
        $this->assertStringNotContainsString('nope', $body['message']);
        $this->assertMatchesRegularExpression('/^ERR-[A-Z0-9]{8}$/', $body['error']['reference']);
        $this->assertStringContainsString('Nothing was changed', $body['message']);
    }

    public function test_an_upstream_timeout_says_the_work_continues_in_the_background(): void
    {
        [$status, $body] = $this->translate(new ConnectionException('cURL error 28: Operation timed out'));

        $this->assertSame(504, $status);
        $this->assertStringContainsString('did not respond in time', $body['message']);
        $this->assertStringContainsString('try again', strtolower($body['error']['hint']));
    }

    public function test_a_controllers_own_response_survives_the_handler(): void
    {
        // The revenue gate aborts with a prepared 422 that explains exactly why a lead
        // cannot move stage. Before the fix, the catch-all handler replaced it with a 500.
        $prepared = response()->json([
            'message' => 'Estimated closing amount is required before this stage.',
            'revenue_check' => ['blocked' => true],
        ], 422);

        $handled = app(\Illuminate\Contracts\Debug\ExceptionHandler::class)
            ->render($this->apiRequest(), new HttpResponseException($prepared));

        $this->assertSame(422, $handled->getStatusCode());
        $this->assertStringContainsString('Estimated closing amount is required', $handled->getContent());
    }
}
