<?php

namespace App\Services\News;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleNewsRssClient
{
    private const BASE_URL = 'https://news.google.com/rss/search';

    /**
     * Fetch news items from Google News RSS feed.
     *
     * @return array{success: bool, results: list<array{title: string, url: string, snippet: string, source_name: ?string, source_domain: ?string, published_at: ?string}>, error?: string}
     */
    public function search(string $query, string $regionScope = 'id', int $limit = 15): array
    {
        $isGlobal = strtolower($regionScope) === 'global';

        $params = [
            'q' => $query,
            'hl' => $isGlobal ? 'en-US' : 'id',
            'gl' => $isGlobal ? 'US' : 'ID',
            'ceid' => $isGlobal ? 'US:en' : 'ID:id',
        ];

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; LeadsyMarketIntelligence/1.0)',
                    'Accept' => 'application/rss+xml, application/xml, text/xml',
                ])
                ->get(self::BASE_URL, $params);

            if (! $response->successful()) {
                return [
                    'success' => false,
                    'results' => [],
                    'error' => 'Google News RSS returned HTTP '.$response->status(),
                ];
            }

            return [
                'success' => true,
                'results' => $this->parseRssXml($response->body(), $limit),
            ];
        } catch (\Throwable $e) {
            Log::warning('[GoogleNewsRssClient] Feed fetch failed', [
                'query' => $query,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'results' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @return list<array{title: string, url: string, snippet: string, source_name: ?string, source_domain: ?string, published_at: ?string}>
     */
    public function parseRssXml(string $xmlBody, int $limit = 15): array
    {
        if (trim($xmlBody) === '') {
            return [];
        }

        $previousLibXml = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($xmlBody, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previousLibXml);

        if (! $xml || ! isset($xml->channel->item)) {
            return [];
        }

        $items = [];
        foreach ($xml->channel->item as $item) {
            if (count($items) >= $limit) {
                break;
            }

            $rawTitle = trim((string) ($item->title ?? ''));
            $link = trim((string) ($item->link ?? ''));
            if ($rawTitle === '' || $link === '') {
                continue;
            }

            $sourceName = null;
            $sourceDomain = null;

            if (isset($item->source)) {
                $sourceName = trim((string) $item->source) ?: null;
                $sourceAttrs = $item->source->attributes();
                if ($sourceAttrs && isset($sourceAttrs['url'])) {
                    $sourceDomain = $this->extractDomain((string) $sourceAttrs['url']);
                }
            }

            // Strip trailing " - Source Name" appended by Google News titles
            $cleanTitle = $rawTitle;
            if ($sourceName && str_ends_with($cleanTitle, ' - '.$sourceName)) {
                $cleanTitle = trim(mb_substr($cleanTitle, 0, mb_strlen($cleanTitle) - mb_strlen(' - '.$sourceName)));
            } elseif (preg_match('/^(.*)\s+-\s+([^-\|]{2,45})$/u', $cleanTitle, $matches)) {
                $cleanTitle = trim($matches[1]);
                $sourceName = $sourceName ?: trim($matches[2]);
            }

            if (! $sourceDomain) {
                $sourceDomain = $this->extractDomain($link);
            }

            $rawDesc = (string) ($item->description ?? '');
            $cleanSnippet = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($rawDesc), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
            // Google News descriptions often repeat the headline + publisher; avoid redundant snippet
            if ($cleanSnippet === '' || mb_strtolower($cleanSnippet) === mb_strtolower($rawTitle)) {
                $cleanSnippet = $cleanTitle;
            }

            $publishedAt = null;
            $pubDateRaw = trim((string) ($item->pubDate ?? ''));
            if ($pubDateRaw !== '') {
                try {
                    $publishedAt = Carbon::parse($pubDateRaw)->toIso8601String();
                } catch (\Throwable) {
                    $publishedAt = null;
                }
            }

            $items[] = [
                'title' => $cleanTitle,
                'url' => $link,
                'snippet' => mb_substr($cleanSnippet, 0, 500),
                'source_name' => $sourceName,
                'source_domain' => $sourceDomain,
                'published_at' => $publishedAt,
            ];
        }

        return $items;
    }

    private function extractDomain(string $url): ?string
    {
        $host = parse_url(trim($url), PHP_URL_HOST);
        if (! $host) {
            return null;
        }

        $clean = preg_replace('/^www\./i', '', strtolower($host));

        return $clean === 'news.google.com' ? null : $clean;
    }
}
