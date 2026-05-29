<?php

namespace App\Services\Lead;

use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class LeadContactGoogleSearchService
{
    private const FEATURE_NAME = 'lead_contact_google_search_keyword';

    public function __construct(private AIPromptTemplateService $promptTemplates) {}

    /**
     * @return array{success: bool, candidates?: array, query?: string, message?: string, error?: string, meta?: array}
     */
    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $apiKey = $this->configValue([
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
            'GOOGLE_MAPS_BROWSER_API_KEY',
        ], $tenantId);
        $searchEngineId = $this->configValue([
            'GOOGLE_SEARCH_ENGINE_ID',
            'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
            'GOOGLE_CSE_ID',
        ], $tenantId);

        if (! $apiKey || ! $searchEngineId) {
            return [
                'success' => false,
                'error' => 'Google Search requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in Integration Settings or backend environment.',
            ];
        }

        $query = $this->buildQuery($lead);
        if ($query === '') {
            return ['success' => false, 'error' => 'Lead company name is required before Google contact search.'];
        }

        $response = Http::timeout(20)->get('https://www.googleapis.com/customsearch/v1', [
            'key' => $apiKey,
            'cx' => $searchEngineId,
            'q' => $query,
            'num' => 10,
        ]);

        if (! $response->successful()) {
            $message = $response->json('error.message') ?: 'Google Search request failed.';

            return ['success' => false, 'error' => $message, 'query' => $query];
        }

        $items = $response->json('items') ?? [];
        $candidates = $this->parseCandidates(is_array($items) ? $items : [], $lead);

        return [
            'success' => true,
            'candidates' => $candidates,
            'query' => $query,
            'message' => empty($candidates)
                ? 'Google did not return LinkedIn profile candidates for this lead.'
                : 'Google LinkedIn contact candidates loaded.',
            'meta' => [
                'total_results' => $response->json('searchInformation.totalResults'),
                'search_time' => $response->json('searchInformation.searchTime'),
            ],
        ];
    }

    private function buildQuery(Lead $lead): string
    {
        $domain = $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST);
        $defaultQuery = 'site:linkedin.com/in "{{company_name}}" ("manager" OR "director" OR "head" OR "general manager" OR "finance" OR "operations" OR "procurement" OR "IT" OR "sales")';

        $query = $this->promptTemplates->compilePrompt(self::FEATURE_NAME, $defaultQuery, [
            'company_name' => $lead->company_name,
            'company_domain' => $domain,
            'website' => $lead->website,
            'industry' => $lead->industry?->name,
            'business_category' => $lead->business_category,
            'address' => $lead->address,
        ]);

        return trim(preg_replace('/\s+/', ' ', $query) ?? '');
    }

    private function parseCandidates(array $items, Lead $lead): array
    {
        $seen = [];
        $candidates = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $linkedinUrl = $this->normalizeLinkedinUrl((string) ($item['link'] ?? ''));
            if (! $linkedinUrl) {
                continue;
            }

            $linkedinId = $this->normalizeLinkedinId($linkedinUrl);
            if (! $linkedinId || isset($seen[$linkedinId])) {
                continue;
            }

            $parsed = $this->parseTitle((string) ($item['title'] ?? ''));
            if ($parsed['name'] === '') {
                continue;
            }

            $snippet = trim((string) ($item['snippet'] ?? ''));
            $companyMatch = $this->matchesCompany($lead, ($item['title'] ?? '').' '.$snippet);
            $confidence = $companyMatch ? 82 : 68;
            $seen[$linkedinId] = true;

            $candidate = [
                'provider_candidate_id' => hash('sha256', strtolower($linkedinUrl)),
                'name' => $parsed['name'],
                'title' => $parsed['title'],
                'company_name' => $lead->company_name,
                'company_domain' => $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST),
                'linkedin_url' => $linkedinUrl,
                'linkedin_id' => $linkedinId,
                'confidence_score' => $confidence,
                'relevance_reason' => $companyMatch
                    ? 'Google returned a public LinkedIn profile result mentioning this company.'
                    : 'Google returned a public LinkedIn profile result from a company-specific query; verify company match before using.',
                'evidence' => $snippet,
                'google_title' => $item['title'] ?? null,
                'google_display_link' => $item['displayLink'] ?? null,
            ];

            $candidates[] = $candidate + ['raw_preview' => $candidate + ['google_result' => $item]];
        }

        return $candidates;
    }

    private function parseTitle(string $title): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $title) ?? '');
        $clean = preg_replace('/\s*[-|]\s*LinkedIn\s*$/i', '', $clean) ?? $clean;
        $clean = preg_replace('/\s*\|\s*LinkedIn.*$/i', '', $clean) ?? $clean;

        $parts = array_values(array_filter(array_map('trim', preg_split('/\s+-\s+/', $clean) ?: [])));
        $name = $parts[0] ?? $clean;
        $jobTitle = $parts[1] ?? null;
        if ($jobTitle && preg_match('/\b(profile|profil|professional|profesional)\b/i', $jobTitle)) {
            $jobTitle = null;
        }

        if (preg_match('/\b(profile|profiles|people|linkedin)\b/i', $name)) {
            return ['name' => '', 'title' => null];
        }

        return [
            'name' => Str::of($name)->limit(120, '')->trim()->toString(),
            'title' => $jobTitle ? Str::of($jobTitle)->limit(160, '')->trim()->toString() : null,
        ];
    }

    private function normalizeLinkedinUrl(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $path = (string) ($parts['path'] ?? '');

        if ($host !== 'linkedin.com' && ! str_ends_with($host, '.linkedin.com')) {
            return null;
        }

        if (! preg_match('#^/in/[A-Za-z0-9._%-]+/?$#', $path)) {
            return null;
        }

        return 'https://www.linkedin.com'.rtrim($path, '/');
    }

    private function normalizeLinkedinId(string $linkedinUrl): ?string
    {
        $path = parse_url($linkedinUrl, PHP_URL_PATH) ?: '';
        if (preg_match('#^/in/([A-Za-z0-9._%-]+)/?$#', $path, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function matchesCompany(Lead $lead, string $text): bool
    {
        $haystack = Str::lower($text);
        $company = Str::lower((string) $lead->company_name);
        $domain = Str::lower((string) ($lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST)));

        return ($company !== '' && str_contains($haystack, $company))
            || ($domain !== '' && str_contains($haystack, $domain));
    }

    private function configValue(array $keys, ?int $tenantId): ?string
    {
        foreach ($keys as $key) {
            $value = env($key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }

            $record = IntegrationConfig::query()
                ->where('key', $key)
                ->where('is_active', true)
                ->when($tenantId, fn ($query) => $query->where(fn ($inner) => $inner
                    ->whereNull('tenant_id')
                    ->orWhere('tenant_id', $tenantId)
                ))
                ->orderByRaw('tenant_id is null')
                ->latest()
                ->first();

            if (is_string($record?->value) && trim($record->value) !== '') {
                return trim($record->value);
            }
        }

        return null;
    }
}
