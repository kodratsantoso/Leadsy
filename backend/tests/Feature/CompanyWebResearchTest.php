<?php

namespace Tests\Feature;

use App\Services\Search\CompanyWebResearchService;
use App\Services\Search\GoogleCustomSearchClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Facts come from the internet; the model only organises them.
 *
 * Profiling used to ask the model to recall Indonesian company details while telling it
 * to "check Kemendag and JobStreet" — instructions it could not follow, because a
 * web-search tool exists only on the Gemini branch and routing sends these calls to
 * BytePlus. The result was thin profiles and confident invention.
 */
class CompanyWebResearchTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, string|false> */
    private array $originalEnv = [];

    private const SEARCH_ENV = ['GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (self::SEARCH_ENV as $key) {
            $this->originalEnv[$key] = getenv($key);
        }
    }

    /**
     * putenv() is process-wide, and these tests set search credentials that other tests
     * assert the ABSENCE of — OpenSearchTest checks for a 503 when no key is configured.
     * Without this, running the suite in one process made it fail depending on order.
     */
    protected function tearDown(): void
    {
        foreach (self::SEARCH_ENV as $key) {
            $original = $this->originalEnv[$key] ?? false;
            $original === false ? putenv($key) : putenv("{$key}={$original}");
        }

        parent::tearDown();
    }

    private function fakeSearch(array $items): void
    {
        Http::fake([
            'customsearch.googleapis.com/*' => Http::response(['items' => $items], 200),
        ]);
    }

    public function test_findings_carry_the_snippet_and_its_source_url(): void
    {
        config(['app.env' => 'testing']);
        putenv('GOOGLE_SEARCH_API_KEY=test-key');
        putenv('GOOGLE_SEARCH_ENGINE_ID=test-cx');

        $this->fakeSearch([
            ['title' => 'PT Axindo Humaper', 'link' => 'https://axindo.co.id/about', 'snippet' => 'Distributor bahan kimia industri sejak 1998.'],
        ]);

        $result = app(CompanyWebResearchService::class)->research('PT Axindo Humaper');

        $this->assertTrue($result['available']);
        $this->assertStringContainsString('Distributor bahan kimia industri', $result['findings']);
        $this->assertStringContainsString('https://axindo.co.id/about', $result['findings']);
        $this->assertContains('https://axindo.co.id/about', $result['sources']);
    }

    public function test_an_unconfigured_search_is_reported_rather_than_faked(): void
    {
        putenv('WEB_RESEARCH_PROVIDER_ORDER=google');
        putenv('GOOGLE_SEARCH_API_KEY');
        putenv('GOOGLE_SEARCH_ENGINE_ID');

        $result = app(CompanyWebResearchService::class)->research('PT Tanpa Konfigurasi');

        $this->assertFalse($result['available']);
        $this->assertSame([], $result['sources']);
        $this->assertNotEmpty($result['reason']);
    }

    public function test_no_results_is_not_the_same_as_search_being_broken(): void
    {
        putenv('WEB_RESEARCH_PROVIDER_ORDER=google');
        putenv('GOOGLE_SEARCH_API_KEY=test-key');
        putenv('GOOGLE_SEARCH_ENGINE_ID=test-cx');
        $this->fakeSearch([]);

        $result = app(CompanyWebResearchService::class)->research('PT Tidak Ditemukan');

        $this->assertFalse($result['available']);
        $this->assertStringContainsString('No public results', $result['reason']);
    }

    public function test_an_empty_company_name_does_not_reach_the_network(): void
    {
        Http::fake();

        $result = app(GoogleCustomSearchClient::class)->search('   ');

        $this->assertFalse($result['success']);
        Http::assertNothingSent();
    }
}
