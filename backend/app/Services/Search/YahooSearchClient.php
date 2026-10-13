<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Free web search provider using Yahoo Search HTML scraping.
 *
 * Modeled after the proven zero-config scraping pipeline in ContactDeepSearchService.
 * Requires NO API key, zero credentials, and acts as the universal baseline fallback
 * whenever Google CSE, Tavily, Serper, or Brave are unconfigured or exceed quotas.
 */
class YahooSearchClient implements WebSearchProvider
{
    private const ENDPOINT = 'https://search.yahoo.com/search';

    private const CACHE_TTL_DAYS = 7;

    private const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ];

    public function key(): string
    {
        return 'yahoo';
    }

    public function label(): string
    {
        return 'Yahoo Search (Free / Scraper)';
    }

    /**
     * Always considered configured because it requires no credentials or API key.
     */
    public function isConfigured(?int $tenantId = null): bool
    {
        return true;
    }

    public function search(string $query, ?int $tenantId = null, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return ['success' => false, 'results' => [], 'error' => 'Empty search query.'];
        }

        $cacheKey = 'yahoo_web_search_v1_'.sha1($query);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return ['success' => true, 'results' => array_slice($cached, 0, $limit)];
        }

        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENTS[array_rand(self::USER_AGENTS)],
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding' => 'gzip, deflate',
                'Referer' => 'https://search.yahoo.com/',
            ])
                ->timeout(12)
                ->get(self::ENDPOINT, [
                    'p' => $query,
                ]);
        } catch (\Throwable $e) {
            Log::warning('[YahooSearch] request failed', ['query' => $query, 'error' => $e->getMessage()]);

            return ['success' => false, 'results' => [], 'error' => 'Yahoo Search request could not be sent.'];
        }

        if (! $response->successful()) {
            Log::warning('[YahooSearch] non-success response', ['query' => $query, 'status' => $response->status()]);

            return ['success' => false, 'results' => [], 'error' => "Yahoo Search returned HTTP {$response->status()}."];
        }

        $results = $this->parseHtml($response->body());

        if ($results === []) {
            return ['success' => false, 'results' => [], 'error' => 'Yahoo Search returned no extractable results.'];
        }

        Cache::put($cacheKey, $results, now()->addDays(self::CACHE_TTL_DAYS));

        return [
            'success' => true,
            'results' => array_slice($results, 0, $limit),
        ];
    }

    /**
     * Parse Yahoo search result HTML into uniform title/link/snippet structures.
     *
     * @return list<array{title: string, link: string, snippet: string}>
     */
    private function parseHtml(string $html): array
    {
        $results = [];
        preg_match_all('/<li[^>]*>(.*?)<\/li>/s', $html, $matches);

        foreach ($matches[1] as $block) {
            // Find redirection URL inside the block
            if (! preg_match('/href=["\'](https:\/\/r\.search\.yahoo\.com\/[^\'"]+)["\']/', $block, $hrefMatch)) {
                continue;
            }

            $url = $hrefMatch[1];
            // Extract the RU parameter (target URL) from Yahoo redirect link
            if (! preg_match('/RU=([^&|\/]+)/', $url, $ruMatch)) {
                continue;
            }

            $decodedUrl = urldecode($ruMatch[1]);

            // Skip internal Yahoo / search URLs
            if (str_contains($decodedUrl, 'search.yahoo.com') || str_contains($decodedUrl, 'yahoo.com/preferences')) {
                continue;
            }

            // Extract Title
            $title = '';
            if (preg_match('/<h3[^>]*>(.*?)<\/h3>/s', $block, $titleMatch)) {
                $title = trim(html_entity_decode(strip_tags($titleMatch[1]), ENT_QUOTES, 'UTF-8'));
            }

            if ($title === '') {
                continue;
            }

            // Extract Snippet
            $snippet = '';
            if (preg_match('/<div class=["\'][^"\']*(?:compText|fz-ms|lh-16|compDesc)[^"\']*><p[^>]*>(.*?)<\/p>/s', $block, $snippetMatch)) {
                $snippet = trim(html_entity_decode(strip_tags($snippetMatch[1]), ENT_QUOTES, 'UTF-8'));
            } elseif (preg_match('/<div class=["\'][^"\']*(?:compText|fz-ms|lh-16|compDesc)[^"\']*[^>]*>(.*?)<\/div>/s', $block, $snippetMatch)) {
                $snippet = trim(html_entity_decode(strip_tags($snippetMatch[1]), ENT_QUOTES, 'UTF-8'));
            } elseif (preg_match('/<p[^>]*>(.*?)<\/p>/s', $block, $pMatch)) {
                $snippet = trim(html_entity_decode(strip_tags($pMatch[1]), ENT_QUOTES, 'UTF-8'));
            }

            $results[] = [
                'title' => $title,
                'link' => $decodedUrl,
                'snippet' => $snippet,
            ];
        }

        // Deduplicate by target URL
        $deduped = [];
        $seen = [];
        foreach ($results as $item) {
            $key = strtolower(rtrim($item['link'], '/'));
            if (! isset($seen[$key])) {
                $seen[$key] = true;
                $deduped[] = $item;
            }
        }

        return $deduped;
    }
}
