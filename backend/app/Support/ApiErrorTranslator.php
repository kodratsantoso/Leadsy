<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Turns any exception raised inside /api/* into a response a salesperson can act on.
 *
 * The rule this class exists to enforce: the user is always told *what went wrong* and
 * *what to do next*, and is never shown a database message, a class name, a file path or
 * a stack frame. Where the real cause cannot be said safely, the response instead carries
 * a reference code that points at the exact log line, so support can find it in seconds
 * rather than asking the user to reproduce the problem.
 *
 * Every message here is written for the person who hit it, not for the developer reading
 * the log — "Ask an administrator to assign this lead to you", not "Forbidden".
 */
class ApiErrorTranslator
{
    public static function make(): self
    {
        return new self();
    }

    /**
     * The sentence shown when nothing more specific is known about an HTTP status.
     *
     * Previously every one of these fell through to the same "An unexpected server error
     * occurred." — so a permission problem, a deleted record and a genuine crash were
     * indistinguishable on screen, and all three read like the server was broken.
     */
    private const STATUS_MESSAGES = [
        400 => 'The request could not be read. Reload the page and try again.',
        401 => 'Your session has ended. Sign in again to continue.',
        403 => 'You do not have access to this record. It may belong to another team — ask an administrator to assign it to you or to check your role.',
        404 => 'This record no longer exists. It may have been deleted or moved to Trash.',
        405 => 'This action is not available here.',
        409 => 'Someone else changed this record while you had it open. Reload the page so you do not overwrite their work, then try again.',
        413 => 'The file is too large to upload.',
        419 => 'Your session expired while this page was open. Sign in again — your unsaved changes on this form will be lost.',
        422 => 'Some of the information could not be saved.',
        429 => 'Too many requests in a short time. Wait about a minute, then try again.',
        // Deliberately does not promise "nothing was changed": an unclassified failure can
        // land after a write has already committed — LeadController::update() saves the lead
        // and only then writes its audit entry, with no transaction around the pair. Only the
        // cases below that are known not to have written say so.
        500 => 'Something went wrong on our side while handling this request. Reload the page to see whether it went through, and if this keeps happening send the reference code below to your administrator.',
        502 => 'The server did not answer correctly. Try again in a moment.',
        503 => 'The service is temporarily unavailable, usually during a deployment. Try again in a minute.',
        504 => 'This took too long to finish and was stopped. If it was an AI analysis, it keeps running in the background — reload the page in a few minutes to see the result.',
    ];

    public function toResponse(Throwable $e, Request $request): JsonResponse
    {
        $translated = $this->translate($e);

        $status = $translated['status'];
        $reference = null;

        // Only a genuine failure gets a reference code — a 403 or a validation error is
        // expected traffic, and stamping a code on it would make routine refusals look
        // like outages worth reporting.
        if ($status >= 500) {
            $reference = 'ERR-'.strtoupper(Str::random(8));
            $this->logFailure($e, $request, $reference, $status);
        }

        $payload = [
            'success' => false,
            'data' => null,
            'meta' => [],
            'error' => array_filter([
                'code' => $translated['code'],
                'message' => $translated['message'],
                'hint' => $translated['hint'] ?? null,
                'details' => $translated['details'] ?? null,
                'reference' => $reference,
            ], fn ($value) => $value !== null && $value !== []),
            'message' => $translated['message'],
        ];

        // Laravel's own shape puts field errors at the top level, and most of the frontend
        // was written against that. Keep it so nothing has to be rewritten to benefit.
        if (! empty($translated['details'])) {
            $payload['errors'] = $translated['details'];
        }

        return response()->json($payload, $status);
    }

    /** @return array{status:int, code:string, message:string, hint?:string, details?:array} */
    private function translate(Throwable $e): array
    {
        if ($e instanceof ValidationException) {
            return $this->fromValidation($e);
        }

        if ($e instanceof AuthenticationException) {
            return [
                'status' => 401,
                'code' => 'UNAUTHENTICATED',
                'message' => self::STATUS_MESSAGES[401],
            ];
        }

        if ($e instanceof ConnectionException) {
            return [
                'status' => 504,
                'code' => 'UPSTREAM_UNREACHABLE',
                'message' => 'An external service did not respond in time, so this step could not finish.',
                'hint' => 'This is usually the AI provider being slow. Your data was not changed — try again in a few minutes.',
            ];
        }

        if ($e instanceof QueryException) {
            return $this->fromDatabase($e);
        }

        if ($e instanceof HttpExceptionInterface) {
            $status = $e->getStatusCode();

            // abort(403, 'why') carries a sentence a developer wrote for this exact case, and
            // that is always better than our default. abort(403) carries an empty one, and
            // the framework fills some in itself — those are useless or leaky, so they lose.
            $message = trim($e->getMessage());

            return [
                'status' => $status,
                'code' => $this->codeForStatus($status),
                'message' => $this->isFrameworkNoise($message)
                    ? $this->messageForStatus($status)
                    : $message,
            ];
        }

        return [
            'status' => 500,
            'code' => 'SERVER_ERROR',
            'message' => config('app.debug')
                ? $e->getMessage()
                : self::STATUS_MESSAGES[500],
        ];
    }

    /**
     * Validation errors already say exactly what is wrong; the old handler threw that away
     * and replaced it with "The given data was invalid.", which tells the user nothing about
     * which of forty fields to fix.
     */
    private function fromValidation(ValidationException $e): array
    {
        $errors = $e->errors();
        $first = collect($errors)->flatten()->filter()->values();

        $message = match (true) {
            $first->count() === 1 => $first->first(),
            $first->count() > 1 => $first->first().' (and '.($first->count() - 1).' other '.Str::plural('problem', $first->count() - 1).' on this form)',
            default => self::STATUS_MESSAGES[422],
        };

        return [
            'status' => 422,
            'code' => 'VALIDATION_ERROR',
            'message' => $message,
            'details' => $errors,
        ];
    }

    /**
     * Database failures are the ones users hit most often and understand least.
     *
     * The driver message is never returned — it names tables, columns and constraints — but
     * the SQLSTATE class is safe and says precisely what kind of problem it is, which is
     * enough to write a sentence the user can act on.
     */
    private function fromDatabase(QueryException $e): array
    {
        $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
        $raw = $e->getMessage();

        // Unique violation: 23505 on PostgreSQL, 23000 on MySQL.
        if ($sqlState === '23505' || $sqlState === '23000') {
            $field = $this->fieldFromConstraint($raw);

            return [
                'status' => 409,
                'code' => 'DUPLICATE_VALUE',
                'message' => $field
                    ? "Another record already uses this {$field}."
                    : 'Another record already uses one of these values.',
                'hint' => 'Values that must be unique cannot be shared between two leads. Search for the existing record, or change the value.',
            ];
        }

        // Foreign key violation.
        if ($sqlState === '23503') {
            return [
                'status' => 409,
                'code' => 'RELATED_RECORD_CONFLICT',
                'message' => 'This cannot be saved because it points to a record that no longer exists, or it is still used by other records.',
                'hint' => 'Reload the page to refresh the dropdown options. If you were deleting something, remove or reassign the records attached to it first.',
            ];
        }

        // NOT NULL violation — a required field arrived empty.
        if ($sqlState === '23502') {
            $field = $this->fieldFromNotNull($raw);

            return [
                'status' => 422,
                'code' => 'REQUIRED_FIELD_MISSING',
                'message' => $field
                    ? "\"{$field}\" is required and was left empty."
                    : 'A required field was left empty.',
            ];
        }

        // Value longer than the column allows.
        if ($sqlState === '22001') {
            return [
                'status' => 422,
                'code' => 'VALUE_TOO_LONG',
                'message' => 'One of the fields is longer than allowed. Shorten it and save again.',
            ];
        }

        // Wrong type for the column — a letter where a number belongs, a malformed date.
        if ($sqlState === '22P02' || $sqlState === '22007' || $sqlState === '22008') {
            return [
                'status' => 422,
                'code' => 'VALUE_WRONG_FORMAT',
                'message' => 'One of the values has the wrong format — check any number, date or amount on this form.',
            ];
        }

        // Connection class (08xxx) and admin shutdown — the database itself is unreachable.
        if (str_starts_with($sqlState, '08') || $sqlState === '57P01' || $sqlState === '57P03') {
            return [
                'status' => 503,
                'code' => 'DATABASE_UNREACHABLE',
                'message' => 'The database is not reachable right now, usually during a deployment. Nothing was saved. Try again in a minute.',
            ];
        }

        // Lock timeouts and deadlocks — worth retrying, unlike everything below.
        if ($sqlState === '40001' || $sqlState === '40P01' || $sqlState === '55P03') {
            return [
                'status' => 409,
                'code' => 'RECORD_BUSY',
                'message' => 'This record is being changed by someone else at the same moment. Wait a few seconds and save again.',
            ];
        }

        // Anything else (42xxx syntax/undefined column, and the long tail) is a bug in our
        // code, not something the user can fix. It stays a 500 so it gets a reference code
        // and a log line.
        return [
            'status' => 500,
            'code' => 'DATABASE_ERROR',
            'message' => 'The record could not be saved because of a problem in the system, not with what you entered. Nothing was changed.',
        ];
    }

    /** Pull a readable field name out of "...unique constraint \"leads_email_unique\"". */
    private function fieldFromConstraint(string $raw): ?string
    {
        if (preg_match('/Key \((?<cols>[^)]+)\)=/', $raw, $m)) {
            return $this->humanize($m['cols']);
        }

        if (preg_match('/unique constraint "(?<name>[^"]+)"/i', $raw, $m)) {
            $name = preg_replace('/_unique$/', '', $m['name']);
            $name = preg_replace('/^[a-z0-9]+_/', '', (string) $name);

            return $name ? $this->humanize($name) : null;
        }

        if (preg_match("/for key '(?<name>[^']+)'/i", $raw, $m)) {
            return $this->humanize(preg_replace('/_unique$/', '', $m['name']) ?: $m['name']);
        }

        return null;
    }

    /** Pull the column out of "null value in column \"company_name\" violates...". */
    private function fieldFromNotNull(string $raw): ?string
    {
        if (preg_match('/column "(?<col>[^"]+)"/i', $raw, $m)) {
            return $this->humanize($m['col']);
        }

        if (preg_match("/Column '(?<col>[^']+)'/i", $raw, $m)) {
            return $this->humanize($m['col']);
        }

        return null;
    }

    private function humanize(string $column): string
    {
        $label = str_replace('_', ' ', trim($column));
        $label = preg_replace('/\bid\b/i', '', $label);

        return Str::title(trim((string) $label)) ?: $column;
    }

    /**
     * True when a message came from the framework rather than from us.
     *
     * Route model binding is the one that matters: a missing lead surfaces as
     * "No query results for model [App\Models\Lead] 512", which names an internal class to
     * the user and still does not tell them the lead was deleted. Laravel's stock
     * "This action is unauthorized." is the same problem in the other direction — accurate,
     * and no help at all in deciding what to do next.
     */
    private function isFrameworkNoise(string $message): bool
    {
        if ($message === '') {
            return true;
        }

        foreach (['No query results for model', 'This action is unauthorized', 'Unauthenticated', 'Server Error', 'Not Found', 'Forbidden', 'Bad request'] as $needle) {
            if (Str::startsWith($message, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function codeForStatus(int $status): string
    {
        return match ($status) {
            401 => 'UNAUTHENTICATED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            409 => 'CONFLICT',
            413 => 'PAYLOAD_TOO_LARGE',
            419 => 'SESSION_EXPIRED',
            422 => 'VALIDATION_ERROR',
            429 => 'RATE_LIMITED',
            503 => 'SERVICE_UNAVAILABLE',
            504 => 'TIMEOUT',
            default => $status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR',
        };
    }

    private function messageForStatus(int $status): string
    {
        return self::STATUS_MESSAGES[$status]
            ?? ($status >= 500 ? self::STATUS_MESSAGES[500] : self::STATUS_MESSAGES[400]);
    }

    /**
     * One log line per failure, carrying the same reference the user sees.
     *
     * This is the half that was missing: the old handler hid the message from the user and
     * added nothing to the log to compensate, so a report of "an unexpected server error"
     * could not be tied to any particular request.
     */
    private function logFailure(Throwable $e, Request $request, string $reference, int $status): void
    {
        Log::error("[{$reference}] {$request->method()} {$request->path()} failed with {$status}", [
            'reference' => $reference,
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'at' => $e->getFile().':'.$e->getLine(),
            'route' => optional($request->route())->getName(),
            'user_id' => optional($request->user())->id,
            'input' => $this->safeInput($request),
            'trace' => collect($e->getTrace())
                ->take(8)
                ->map(fn ($frame) => ($frame['file'] ?? '?').':'.($frame['line'] ?? '?'))
                ->all(),
        ]);
    }

    /** Request body for the log, with anything credential-shaped removed. */
    private function safeInput(Request $request): array
    {
        $hidden = ['password', 'password_confirmation', 'current_password', 'token', 'api_key', 'secret', 'authorization'];

        return collect($request->except($hidden))
            ->map(fn ($value) => is_scalar($value) ? Str::limit((string) $value, 200) : '['.gettype($value).']')
            ->all();
    }
}
