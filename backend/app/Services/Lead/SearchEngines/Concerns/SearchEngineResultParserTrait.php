<?php

namespace App\Services\Lead\SearchEngines\Concerns;

use App\Models\IntegrationConfig;
use App\Models\Lead;
use Illuminate\Support\Str;

trait SearchEngineResultParserTrait
{
    /**
     * Retrieve integration config value for key(s), scoped to tenant.
     */
    protected function getConfigValue(string|array $keys, ?int $tenantId = null, mixed $default = null): mixed
    {
        $keys = (array) $keys;

        $config = IntegrationConfig::query()
            ->whereIn('key', $keys)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->where('is_active', true)
            ->orderByRaw('tenant_id IS NOT NULL DESC')
            ->first();

        return $config?->value ?? $default;
    }

    /**
     * Check if a config key is truthy.
     */
    protected function isConfigEnabled(string|array $keys, ?int $tenantId = null, bool $default = false): bool
    {
        $val = $this->getConfigValue($keys, $tenantId, $default);
        return $val === true || $val === 'true' || $val === '1' || $val === 1;
    }

    /**
     * Parse a LinkedIn SERP title like "Budi Santoso - General Manager - PT Holycow | LinkedIn"
     *
     * @return array{name: string, title: string|null}
     */
    protected function parseLinkedinTitle(string $title): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $title) ?? '');
        $clean = preg_replace('/\s*[-|]\s*LinkedIn\s*$/i', '', $clean) ?? $clean;
        $clean = preg_replace('/\s*\|\s*LinkedIn.*$/i', '', $clean) ?? $clean;

        // Split by standard dash, en-dash, em-dash, or pipe
        $parts = array_values(array_filter(array_map('trim', preg_split('/\s+[-–—|]\s+/', $clean) ?: [])));
        $name = $parts[0] ?? $clean;
        $jobTitle = $parts[1] ?? null;

        if ($jobTitle && preg_match('/\b(profile|profil|professional|profesional)\b/i', $jobTitle)) {
            $jobTitle = null;
        }

        if (preg_match('/\b(profile|profiles|people|linkedin|search|directors?|managers?)\b/i', $name)) {
            // If name is just a keyword, check if part 1 was title
            if (!empty($parts[1]) && !preg_match('/\b(profile|profiles|people|linkedin|search)\b/i', $parts[1])) {
                $name = $parts[1];
                $jobTitle = $parts[0];
            } else {
                return ['name' => '', 'title' => null];
            }
        }

        return [
            'name' => Str::limit(trim($name), 120, ''),
            'title' => $jobTitle ? Str::limit(trim($jobTitle), 160, '') : null,
        ];
    }

    /**
     * Normalize LinkedIn URL to standard https://www.linkedin.com/in/{id}
     */
    protected function normalizeLinkedinUrl(string $url): ?string
    {
        if (!str_contains($url, 'linkedin.com/in/')) {
            return null;
        }

        $id = $this->extractLinkedinId($url);
        return $id ? "https://www.linkedin.com/in/{$id}" : null;
    }

    /**
     * Extract LinkedIn profile ID from URL.
     */
    protected function extractLinkedinId(string $url): ?string
    {
        $parsed = parse_url($url, PHP_URL_PATH);
        if (!$parsed) {
            return null;
        }

        if (preg_match('#^/(?:[a-z]{2}/)?in/([A-Za-z0-9._%-]+)/?#i', $parsed, $matches)) {
            return strtolower($matches[1]);
        }

        return null;
    }

    /**
     * Extract any email addresses present in snippet or description.
     *
     * @return string[]
     */
    protected function extractEmailsFromText(string $text): array
    {
        $stripped = html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8');
        preg_match_all('/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/', $stripped, $matches);

        $exclude = ['example.com', 'email.com', 'domain.com', 'company.com', 'test.com', 'mail.com', 'sentry.io'];
        $emails = [];
        foreach ($matches[0] ?? [] as $email) {
            $domain = explode('@', $email)[1] ?? '';
            if (!in_array(strtolower($domain), $exclude)) {
                $emails[] = strtolower($email);
            }
        }

        return array_values(array_unique($emails));
    }

    /**
     * Extract recognizable brand/entity tokens from lead data.
     *
     * @return string[]
     */
    protected function extractBrandTokens(Lead $lead): array
    {
        $tokens = [];

        if (!empty($lead->brand)) {
            $cleanBrand = trim((string) $lead->brand);
            $tokens[] = $cleanBrand;
            $stripped = trim(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $cleanBrand));
            if ($stripped !== '' && strcasecmp($stripped, $cleanBrand) !== 0) {
                $tokens[] = $stripped;
            }
        }

        $companyName = (string) $lead->company_name;
        $parts = preg_split('/[\/|&+]|\bdan\b|\(|\)/i', $companyName) ?: [];
        foreach ($parts as $part) {
            $clean = trim($part);
            if ($clean === '') {
                continue;
            }

            $clean = preg_replace('/(^|\s+)(PT|CV|UD|PD|Perum|Yayasan|Koperasi|Firma|Persero)\.?\s+/i', '$1', $clean);
            $clean = preg_replace('/\s+(Tbk|Ltd|LLC|Inc|Corp|Pte|Co)\.?(\s+|$)/i', '$2', $clean);
            $clean = trim(preg_replace('/^[.,\-\s]+|[.,\-\s]+$/u', '', $clean));
            $clean = trim(preg_replace('/\s+/', ' ', $clean));

            if (mb_strlen($clean) >= 2) {
                $tokens[] = $clean;
                $withoutId = trim(preg_replace('/\bIndonesia\b/i', '', $clean));
                $withoutId = trim(preg_replace('/\s+/', ' ', $withoutId));
                if (mb_strlen($withoutId) >= 2 && !in_array(strtolower($withoutId), array_map('strtolower', $tokens))) {
                    $tokens[] = $withoutId;
                }
            }
        }

        $unique = [];
        foreach ($tokens as $t) {
            $t = trim($t);
            if ($t !== '' && !in_array(strtolower($t), array_map('strtolower', $unique))) {
                $unique[] = $t;
            }
        }

        return $unique;
    }

    /**
     * Build standard LinkedIn discovery queries for lead.
     *
     * @return string[]
     */
    protected function buildSearchQueries(Lead $lead): array
    {
        $tokens = $this->extractBrandTokens($lead);
        $primaryBrand = !empty($tokens) ? $tokens[0] : $lead->company_name;
        $roleKeywords = '("director" OR "manager" OR "head" OR "lead" OR "chief" OR "founder" OR "owner" OR "finance" OR "procurement" OR "operations" OR "sales" OR "general manager" OR "IT")';

        $queries = [
            "site:linkedin.com/in \"{$primaryBrand}\" {$roleKeywords}",
        ];

        if (count($tokens) > 1 && $tokens[1] !== $primaryBrand) {
            $queries[] = "site:linkedin.com/in \"{$tokens[1]}\" {$roleKeywords}";
        }

        // Full legal entity if different from brand
        if (strcasecmp($lead->company_name, $primaryBrand) !== 0) {
            $queries[] = "site:linkedin.com/in \"{$lead->company_name}\" {$roleKeywords}";
        }

        return array_values(array_unique($queries));
    }
}

