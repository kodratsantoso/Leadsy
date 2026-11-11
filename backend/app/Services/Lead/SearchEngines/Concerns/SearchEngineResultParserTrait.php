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
     * Extracts:
     * 1. Explicit brand field (if specified)
     * 2. Core brand without generic sector/industry words (e.g. "PT Prasetia Dwidharma Teknologi" -> "Prasetia Dwidharma")
     * 3. Clean full company name without legal prefix/suffix ("Prasetia Dwidharma Teknologi")
     * 4. Domain-based root label hint (e.g. prasetia.co.id -> "Prasetia")
     *
     * @return string[]
     */
    protected function extractBrandTokens(Lead $lead): array
    {
        $tokens = [];

        // 1. Explicit brand field
        if (!empty($lead->brand)) {
            $cleanBrand = trim((string) $lead->brand);
            $tokens[] = $cleanBrand;
            $stripped = trim(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $cleanBrand));
            if ($stripped !== '' && strcasecmp($stripped, $cleanBrand) !== 0) {
                $tokens[] = $stripped;
            }
        }

        // Generic sector/industry words to strip when discovering core brand
        $genericWords = [
            'Teknologi', 'Technology', 'Technologies', 'Tech',
            'Solusi', 'Solution', 'Solutions',
            'Nusantara', 'Utama', 'Global', 'Internasional', 'International',
            'Mandiri', 'Jaya', 'Abadi', 'Makmur', 'Karya', 'Sejahtera', 'Sentosa',
            'Group', 'Grup', 'Holdings', 'Holding', 'Mitra',
            'Sistem', 'Systems', 'System', 'Digital', 'Media',
            'Informatika', 'Komunika', 'Telekomunikasi', 'Telecommunication',
            'Logistik', 'Logistics', 'Indonesia', 'Asia', 'Pratama', 'Dinamika',
            'Persada', 'Semesta', 'Megah', 'Agung', 'Cemerlang',
        ];
        $genericPattern = '/\b(' . implode('|', $genericWords) . ')\b/iu';

        // 2. Company name decomposition
        $companyName = (string) $lead->company_name;
        $parts = preg_split('/[\/|&+]|\bdan\b|\(|\)/iu', $companyName) ?: [];
        foreach ($parts as $part) {
            $clean = trim($part);
            if ($clean === '') {
                continue;
            }

            // Remove Indonesian/global corporate prefixes (PT, CV, UD, etc.)
            $clean = preg_replace('/(^|\s+)(PT|CV|UD|PD|Perum|Yayasan|Koperasi|Firma|Persero)\.?\s+/iu', '$1', $clean);
            // Remove corporate suffixes (Tbk, Ltd, Inc, Corp, Pte Ltd, etc.)
            $clean = preg_replace('/\s+(Tbk|Ltd|LLC|Inc|Corp|Pte|Co|Bhd|GmbH)\.?(\s+|$)/iu', '$2', $clean);
            $clean = trim(preg_replace('/^[.,\-\s]+|[.,\-\s]+$/u', '', $clean));
            $clean = trim(preg_replace('/\s+/', ' ', $clean));

            if (mb_strlen($clean) >= 2) {
                // Core brand without generic sector/industry words (e.g. "Prasetia Dwidharma")
                $core = trim(preg_replace($genericPattern, '', $clean));
                $core = trim(preg_replace('/^[.,\-\s]+|[.,\-\s]+$/u', '', $core));
                $core = trim(preg_replace('/\s+/', ' ', $core));

                if (mb_strlen($core) >= 2) {
                    $tokens[] = $core;
                }

                $tokens[] = $clean;
            }
        }

        // 3. Domain-based brand hint (e.g. prasetia.co.id -> Prasetia)
        $domain = $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST);
        if ($domain) {
            $domain = preg_replace('/^www\./i', '', strtolower(trim($domain)));
            $domainParts = explode('.', $domain);
            $rootDomain = $domainParts[0] ?? '';
            $excludeHosts = ['gmail', 'yahoo', 'hotmail', 'outlook', 'google', 'linktr', 'instagram', 'facebook', 'tokopedia', 'shopee', 'tiktok'];
            if (mb_strlen($rootDomain) >= 3 && !in_array($rootDomain, $excludeHosts)) {
                $tokens[] = ucfirst($rootDomain);
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
     * Creates:
     * 1. Exact quoted core brand query with executive & leadership keywords
     * 2. High-yield loose/unquoted core brand query (critical for catching variants like "PT. Prasetia Dwidharma")
     * 3. Secondary / clean full name query
     * 4. Full legal entity query (if different)
     *
     * @return string[]
     */
    protected function buildSearchQueries(Lead $lead): array
    {
        $tokens = $this->extractBrandTokens($lead);
        $primaryBrand = !empty($tokens) ? $tokens[0] : $lead->company_name;

        // Balanced role keywords to catch C-levels, heads, managers, founders, leads
        $roleKeywords = '("director" OR "manager" OR "head" OR "lead" OR "chief" OR "founder" OR "owner" OR "finance" OR "procurement" OR "operations" OR "sales" OR "general manager" OR "IT" OR "CEO" OR "COO" OR "CTO")';

        $queries = [];

        // 1. Exact quoted core brand with executive/leadership keywords
        $queries[] = "site:linkedin.com/in \"{$primaryBrand}\" {$roleKeywords}";

        // 2. High-yield loose / unquoted core brand query (essential for high-recall profile discovery)
        $queries[] = "site:linkedin.com/in {$primaryBrand} (\"director\" OR \"manager\" OR \"head\" OR \"lead\" OR \"founder\" OR \"CEO\")";

        // 3. Secondary token (e.g. full clean name if different from core brand)
        if (count($tokens) > 1 && strcasecmp($tokens[1], $primaryBrand) !== 0) {
            $queries[] = "site:linkedin.com/in \"{$tokens[1]}\" {$roleKeywords}";
        }

        // 4. Exact legal entity name if different from brand
        $cleanLegal = trim(preg_replace('/\s+/', ' ', (string) $lead->company_name));
        if ($cleanLegal !== '' && strcasecmp($cleanLegal, $primaryBrand) !== 0) {
            $queries[] = "site:linkedin.com/in \"{$cleanLegal}\"";
        }

        return array_values(array_unique($queries));
    }
}

