<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Semantic Cache Service
 * 
 * Provides centralized high-efficiency caching in Redis for:
 * 1. Normalized Web Scraping results (TTL 14 days)
 * 2. Company / Lead Profile enrichments (TTL 30 days)
 * 3. AI Inference Results with semantic query normalization (TTL configurable)
 * 
 * Tracks cache performance (hits, misses, bandwidth/token savings) for administrative observability.
 */
class SemanticCacheService
{
    private const SCRAPE_PREFIX = 'leadsy:semantic:scrape:';
    private const COMPANY_PREFIX = 'leadsy:semantic:company:';
    private const AI_PREFIX = 'leadsy:semantic:ai:';
    private const STATS_KEY = 'leadsy:semantic:stats';

    /**
     * Normalize URL for deterministic cache keys.
     * Strips protocol, trailing slashes, www, and common marketing query parameters (utm_*, fbclid, etc.).
     */
    public function normalizeUrl(string $url): string
    {
        $parsed = parse_url(trim($url));
        if (!$parsed) {
            return strtolower(trim($url));
        }

        $host = preg_replace('/^www\./i', '', strtolower($parsed['host'] ?? ''));
        $path = rtrim($parsed['path'] ?? '', '/');
        
        $filteredQuery = '';
        if (!empty($parsed['query'])) {
            parse_str($parsed['query'], $queryParams);
            // Remove tracking parameters
            $ignoreKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'];
            foreach ($ignoreKeys as $key) {
                unset($queryParams[$key]);
            }
            if (!empty($queryParams)) {
                ksort($queryParams);
                $filteredQuery = '?' . http_build_query($queryParams);
            }
        }

        return $host . $path . $filteredQuery;
    }

    /**
     * Get cached scraped content for a URL.
     */
    public function getScrapedUrl(string $url): ?string
    {
        $normalized = $this->normalizeUrl($url);
        $key = self::SCRAPE_PREFIX . sha1($normalized);

        $cached = Cache::get($key);
        if ($cached !== null) {
            $this->recordHit('scrape', strlen($cached));
            return $cached;
        }

        $this->recordMiss('scrape');
        return null;
    }

    /**
     * Cache scraped content for a URL.
     */
    public function putScrapedUrl(string $url, string $content, int $ttlDays = 14): void
    {
        if (empty(trim($content))) {
            return;
        }

        $normalized = $this->normalizeUrl($url);
        $key = self::SCRAPE_PREFIX . sha1($normalized);

        Cache::put($key, $content, now()->addDays($ttlDays));
    }

    /**
     * Invalidate cached content for a URL.
     */
    public function forgetScrapedUrl(string $url): bool
    {
        $normalized = $this->normalizeUrl($url);
        $key = self::SCRAPE_PREFIX . sha1($normalized);
        return Cache::forget($key);
    }

    /**
     * Get cached company profile by domain or normalized name.
     */
    public function getCompanyProfile(string $companyDomainOrName): ?array
    {
        $normalized = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $companyDomainOrName)));
        $key = self::COMPANY_PREFIX . sha1($normalized);

        $cached = Cache::get($key);
        if ($cached !== null && is_array($cached)) {
            $this->recordHit('company', 1500); // Approximate tokens saved
            return $cached;
        }

        $this->recordMiss('company');
        return null;
    }

    /**
     * Cache company profile.
     */
    public function putCompanyProfile(string $companyDomainOrName, array $profile, int $ttlDays = 30): void
    {
        $normalized = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $companyDomainOrName)));
        $key = self::COMPANY_PREFIX . sha1($normalized);

        Cache::put($key, $profile, now()->addDays($ttlDays));
    }

    /**
     * Invalidate company profile cache.
     */
    public function forgetCompanyProfile(string $companyDomainOrName): bool
    {
        $normalized = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $companyDomainOrName)));
        $key = self::COMPANY_PREFIX . sha1($normalized);
        return Cache::forget($key);
    }

    /**
     * Get or set semantic AI result.
     */
    public function rememberAiResult(string $feature, string $identifier, int $ttlMinutes, callable $callback): array
    {
        $key = self::AI_PREFIX . $feature . ':' . sha1($identifier);

        $cached = Cache::get($key);
        if ($cached !== null && is_array($cached)) {
            $this->recordHit('ai', 1000);
            return array_merge($cached, ['is_semantic_cached' => true]);
        }

        $this->recordMiss('ai');
        $fresh = $callback();

        if (is_array($fresh) && ($fresh['success'] ?? false)) {
            Cache::put($key, $fresh, now()->addMinutes($ttlMinutes));
        }

        return $fresh;
    }

    /**
     * Get overall statistics for cache performance.
     */
    public function getStats(): array
    {
        $stats = Cache::get(self::STATS_KEY, [
            'hits' => 0,
            'misses' => 0,
            'bytes_saved' => 0,
            'estimated_tokens_saved' => 0,
            'by_category' => [
                'scrape' => ['hits' => 0, 'misses' => 0],
                'company' => ['hits' => 0, 'misses' => 0],
                'ai' => ['hits' => 0, 'misses' => 0],
            ],
            'last_reset' => now()->toIso8601String(),
        ]);

        $total = ($stats['hits'] ?? 0) + ($stats['misses'] ?? 0);
        $hitRate = $total > 0 ? round(($stats['hits'] / $total) * 100, 2) : 0;

        return array_merge($stats, [
            'total_requests' => $total,
            'hit_rate_pct' => $hitRate,
        ]);
    }

    /**
     * Reset cache performance statistics.
     */
    public function resetStats(): void
    {
        Cache::put(self::STATS_KEY, [
            'hits' => 0,
            'misses' => 0,
            'bytes_saved' => 0,
            'estimated_tokens_saved' => 0,
            'by_category' => [
                'scrape' => ['hits' => 0, 'misses' => 0],
                'company' => ['hits' => 0, 'misses' => 0],
                'ai' => ['hits' => 0, 'misses' => 0],
            ],
            'last_reset' => now()->toIso8601String(),
        ]);
    }

    private function recordHit(string $category, int $volume): void
    {
        try {
            $stats = Cache::get(self::STATS_KEY, [
                'hits' => 0,
                'misses' => 0,
                'bytes_saved' => 0,
                'estimated_tokens_saved' => 0,
                'by_category' => [
                    'scrape' => ['hits' => 0, 'misses' => 0],
                    'company' => ['hits' => 0, 'misses' => 0],
                    'ai' => ['hits' => 0, 'misses' => 0],
                ],
                'last_reset' => now()->toIso8601String(),
            ]);

            $stats['hits']++;
            if ($category === 'scrape') {
                $stats['bytes_saved'] += $volume;
            } else {
                $stats['estimated_tokens_saved'] += $volume;
            }

            if (isset($stats['by_category'][$category])) {
                $stats['by_category'][$category]['hits']++;
            }

            Cache::put(self::STATS_KEY, $stats, now()->addDays(90));
        } catch (\Throwable $e) {
            Log::debug('[SemanticCache] Failed to record hit: ' . $e->getMessage());
        }
    }

    private function recordMiss(string $category): void
    {
        try {
            $stats = Cache::get(self::STATS_KEY, [
                'hits' => 0,
                'misses' => 0,
                'bytes_saved' => 0,
                'estimated_tokens_saved' => 0,
                'by_category' => [
                    'scrape' => ['hits' => 0, 'misses' => 0],
                    'company' => ['hits' => 0, 'misses' => 0],
                    'ai' => ['hits' => 0, 'misses' => 0],
                ],
                'last_reset' => now()->toIso8601String(),
            ]);

            $stats['misses']++;
            if (isset($stats['by_category'][$category])) {
                $stats['by_category'][$category]['misses']++;
            }

            Cache::put(self::STATS_KEY, $stats, now()->addDays(90));
        } catch (\Throwable $e) {
            Log::debug('[SemanticCache] Failed to record miss: ' . $e->getMessage());
        }
    }
}
