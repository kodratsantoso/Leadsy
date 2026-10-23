<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Collection;

class LeadDuplicateDetectionService
{
    /**
     * Cleans company name by removing legal entities (PT, CV, Tbk, Persero) and non-alphanumeric chars.
     */
    public static function cleanCompanyName(string $name): string
    {
        $name = mb_strtolower($name);
        $name = preg_replace('/\b(pt|cv|tbk|persero|ud|yayasan|perum|holding)\b/u', '', $name);
        $name = preg_replace('/[^\p{L}\p{N}]/u', '', $name);
        return trim($name);
    }

    /**
     * Normalizes a website URL into a bare hostname domain (e.g. bca.co.id).
     */
    public static function cleanDomain(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        $url = trim(mb_strtolower($url));
        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            $url = 'https://' . $url;
        }
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) {
            return null;
        }
        return preg_replace('/^www\./', '', $host);
    }

    /**
     * Finds single lead duplicate based on IDX Code, clean domain, or normalized legal name.
     */
    public function findDuplicate(string $idxCode, string $companyName, ?string $website, int $tenantId): ?Lead
    {
        // 1. Primary Check: external_id = IDX Code
        if (!empty($idxCode)) {
            $lead = Lead::where('tenant_id', $tenantId)
                ->where('external_id', $idxCode)
                ->first();

            if ($lead) {
                return $lead;
            }
        }

        // 2. Secondary Check: Clean Domain Match
        $domain = self::cleanDomain($website);
        if ($domain) {
            $leadByDomain = Lead::where('tenant_id', $tenantId)
                ->where(function ($q) use ($domain) {
                    $q->where('website_domain', $domain)
                      ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(website, 'http://', ''), 'https://', ''), 'www.', '')) LIKE ?", ["{$domain}%"]);
                })
                ->first();

            if ($leadByDomain) {
                return $leadByDomain;
            }
        }

        // 3. Exact Lowercase Name Match
        $nameLower = mb_strtolower(trim($companyName));
        $exactNameLead = Lead::where('tenant_id', $tenantId)
            ->whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower])
            ->first();

        if ($exactNameLead) {
            return $exactNameLead;
        }

        // 4. Normalized Legal Name Match (handles "PT X Tbk" vs "X Tbk, PT")
        $cleanTarget = self::cleanCompanyName($companyName);
        if (strlen($cleanTarget) >= 4) {
            $candidates = Lead::where('tenant_id', $tenantId)
                ->select(['id', 'company_name', 'website', 'website_domain', 'external_id'])
                ->get();

            foreach ($candidates as $cand) {
                if (self::cleanCompanyName($cand->company_name) === $cleanTarget) {
                    return $cand;
                }
            }
        }

        return null;
    }

    /**
     * Efficient batch duplicate detection for a list of companies (resolves in 1-2 queries).
     * Returns an associative array keyed by idx_code:
     *   [ 'BBCA' => [ 'is_duplicate' => true, 'lead_id' => 123, 'lead_company_name' => 'PT Bank Central Asia Tbk' ] ]
     */
    public function findDuplicatesForBatch(array $items, int $tenantId): array
    {
        if (empty($items)) {
            return [];
        }

        $idxCodes = [];
        $domains = [];
        $cleanNameMap = []; // clean_name => idx_code

        foreach ($items as $item) {
            $code = $item['idx_code'] ?? null;
            if (!$code) {
                continue;
            }

            $idxCodes[] = $code;

            $domain = self::cleanDomain($item['website'] ?? null);
            if ($domain) {
                $domains[$domain] = $code;
            }

            $cleanName = self::cleanCompanyName($item['company_name'] ?? '');
            if (strlen($cleanName) >= 4) {
                $cleanNameMap[$cleanName] = $code;
            }
        }

        // Fetch potential matching leads in 1 single database query
        $matchedResults = [];

        $leads = Lead::where('tenant_id', $tenantId)
            ->select(['id', 'company_name', 'website', 'website_domain', 'external_id'])
            ->get();

        foreach ($leads as $lead) {
            // Match 1: external_id matches idx_code
            if (!empty($lead->external_id) && in_array($lead->external_id, $idxCodes, true)) {
                $matchedResults[$lead->external_id] = [
                    'is_duplicate' => true,
                    'lead_id' => $lead->id,
                    'lead_company_name' => $lead->company_name,
                ];
                continue;
            }

            // Match 2: Domain matches
            $leadDomain = $lead->website_domain ?: self::cleanDomain($lead->website);
            if ($leadDomain && isset($domains[$leadDomain])) {
                $code = $domains[$leadDomain];
                if (!isset($matchedResults[$code])) {
                    $matchedResults[$code] = [
                        'is_duplicate' => true,
                        'lead_id' => $lead->id,
                        'lead_company_name' => $lead->company_name,
                    ];
                    continue;
                }
            }

            // Match 3: Clean Name matches
            $leadCleanName = self::cleanCompanyName($lead->company_name);
            if (strlen($leadCleanName) >= 4 && isset($cleanNameMap[$leadCleanName])) {
                $code = $cleanNameMap[$leadCleanName];
                if (!isset($matchedResults[$code])) {
                    $matchedResults[$code] = [
                        'is_duplicate' => true,
                        'lead_id' => $lead->id,
                        'lead_company_name' => $lead->company_name,
                    ];
                }
            }
        }

        // Build default false for all items that didn't match
        $finalMap = [];
        foreach ($items as $item) {
            $code = $item['idx_code'] ?? '';
            if (isset($matchedResults[$code])) {
                $finalMap[$code] = $matchedResults[$code];
            } else {
                $finalMap[$code] = [
                    'is_duplicate' => false,
                    'lead_id' => null,
                    'lead_company_name' => null,
                ];
            }
        }

        return $finalMap;
    }
}
