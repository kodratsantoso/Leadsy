<?php

namespace App\Services\Idx;

use App\Models\Lead;
use App\Models\IdxCompanyProfile;
use App\Models\IdxCompanyCache;
use Illuminate\Support\Facades\DB;

class IdxIntelligenceService
{
    /**
     * Detects public company listing and populates idx_company_profiles.
     */
    public function enrichListedCompany(Lead $lead): ?IdxCompanyProfile
    {
        // 1. Look for matching cache item
        $cleanName = preg_replace('/^(PT|CV|Tbk)\.?\s+/i', '', $lead->company_name);
        $cache = IdxCompanyCache::where('company_name', 'like', "%{$cleanName}%")
            ->orWhere('idx_code', strtoupper(trim($lead->company_name)))
            ->first();

        if (!$cache && $lead->website_domain) {
            $cache = IdxCompanyCache::where('website', 'like', "%{$lead->website_domain}%")->first();
        }

        if (!$cache) {
            return null;
        }

        // Parse emission details from cached payload json
        $payload = $cache->raw_payload_json ?? [];
        $sharesOutstanding = $payload['JumlahSaham'] ?? $payload['Shares'] ?? null;
        $controllingShareholder = $payload['Pengendali'] ?? $payload['ControllingShareholder'] ?? null;
        $isin = $payload['ISIN'] ?? null;
        
        $listingDateStr = $payload['TanggalPencatatan'] ?? $payload['ListingDate'] ?? null;
        $listingDate = null;
        if ($listingDateStr) {
            try {
                $listingDate = \Illuminate\Support\Carbon::parse($listingDateStr)->toDateString();
            } catch (\Exception $e) {
                // Keep null if date format is invalid
            }
        }

        return DB::transaction(function () use ($lead, $cache, $sharesOutstanding, $controllingShareholder, $isin, $listingDate) {
            return IdxCompanyProfile::updateOrCreate(
                ['lead_id' => $lead->id],
                [
                    'ticker' => $cache->idx_code,
                    'isin' => $isin,
                    'listing_date' => $listingDate,
                    'listing_status' => $cache->listing_board ? 'Active (' . $cache->listing_board . ')' : 'Active',
                    'sector' => $cache->sector,
                    'sub_sector' => $cache->sub_industry,
                    'shares_outstanding' => $sharesOutstanding,
                    'controlling_shareholder' => $controllingShareholder,
                    'raw_payload_json' => $cache->raw_payload_json,
                ]
            );
        });
    }
}
