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

    public function test_yahoo_free_scraper_acts_as_automatic_fallback(): void
    {
        putenv('WEB_RESEARCH_PROVIDER_ORDER');
        putenv('TAVILY_API_KEY');
        putenv('SERPER_API_KEY');
        putenv('BRAVE_SEARCH_API_KEY');
        putenv('GOOGLE_SEARCH_API_KEY');

        Http::fake([
            'https://search.yahoo.com/search*' => Http::response('
                <html><body>
                    <li>
                        <a href="https://r.search.yahoo.com/_ylt=123/RU=https%3a%2f%2fparagon-innovation.com/RK=2/RS=abc"><h3>Paragon Technology and Innovation</h3></a>
                        <div class="compText"><p>Produsen kosmetik terkemuka Wardah dan Make Over di Indonesia.</p></div>
                    </li>
                </body></html>
            ', 200),
            'https://paragon-innovation.com*' => Http::response('<html><body><h1>Paragon Official</h1><p>Alamat kantor pusat Jakarta.</p></body></html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $result = app(CompanyWebResearchService::class)->research('PT Paragon Technology');

        $this->assertTrue($result['available']);
        $this->assertContains('yahoo', $result['providers'] ?? []);
        $this->assertStringContainsString('Wardah dan Make Over', $result['findings']);
    }

    public function test_known_website_triggers_direct_crawling_of_official_site(): void
    {
        putenv('WEB_RESEARCH_PROVIDER_ORDER');

        Http::fake([
            'https://kalbe.co.id*' => Http::response('<html><head><title>Kalbe Farma</title></head><body><h1>Tentang Kalbe</h1><p>Perusahaan farmasi terkemuka di Asia Tenggara didirikan 1966.</p></body></html>', 200, ['Content-Type' => 'text/html']),
            'https://search.yahoo.com/search*' => Http::response('<html><body><li><div class="compText"><p>Produk obat dan nutrisi.</p></div></li></body></html>', 200),
        ]);

        $result = app(CompanyWebResearchService::class)->research('PT Kalbe Farma Tbk', 'https://kalbe.co.id');

        $this->assertTrue($result['available']);
        $this->assertContains('direct_site', $result['providers'] ?? []);
        $this->assertSame('https://kalbe.co.id', $result['official_website']);
        $this->assertStringContainsString('Perusahaan farmasi terkemuka di Asia Tenggara', $result['findings']);
    }
}
