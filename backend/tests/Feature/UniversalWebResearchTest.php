<?php

namespace Tests\Feature;

use App\Services\Search\CompanyPageFetcher;
use App\Services\Search\CompanyWebResearchService;
use App\Services\Search\HostResolver;
use App\Services\Search\TavilySearchClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UniversalWebResearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_tavily_search_is_prioritized_when_configured(): void
    {
        putenv('TAVILY_API_KEY=test-tavily-key');
        putenv('WEB_RESEARCH_PROVIDER_ORDER=tavily,google');

        Http::fake([
            'api.tavily.com/*' => Http::response([
                'results' => [
                    [
                        'title' => 'PT Nusantara Makmur - Official',
                        'url' => 'https://nusantaramakmur.co.id',
                        'content' => 'Perusahaan distributor agroindustri dan pupuk terkemuka di Surabaya.',
                    ],
                ],
            ], 200),
            'https://nusantaramakmur.co.id*' => Http::response('<html><head><title>Nusantara Makmur</title></head><body><h1>About Us</h1><p>Contact: info@nusantaramakmur.co.id</p></body></html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $result = app(CompanyWebResearchService::class)->research('PT Nusantara Makmur');

        $this->assertTrue($result['available']);
        $this->assertContains('tavily', $result['providers'] ?? []);
        $this->assertStringContainsString('distributor agroindustri', $result['findings']);
    }

    public function test_page_fetcher_blocks_private_ip_ssrf(): void
    {
        $resolver = new class extends HostResolver {
            public function resolve(string $host): array
            {
                return ['127.0.0.1'];
            }
        };

        $fetcher = new CompanyPageFetcher($resolver);
        $pages = $fetcher->fetchCompanySite('http://internal-meta-service.cluster.local');

        $this->assertSame([], $pages);
    }
}
