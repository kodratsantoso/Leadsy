<?php

namespace App\Services\Idx;

use App\Models\IdxCompanyCache;

class IdxCompanyNormalizer
{
    /**
     * Normalizes the IdxCompanyCache record into the standardized JSON structure.
     */
    public function normalize(IdxCompanyCache $cache): array
    {
        return [
            'idx_code' => $cache->idx_code,
            'company_name' => $cache->company_name,
            'listing_board' => $cache->listing_board,
            'industry' => $cache->industry,
            'sub_industry' => $cache->sub_industry,
            'sector' => $cache->sector,
            'website' => $cache->website,
            'address' => $cache->address,
            'phone' => $cache->phone,
            'email' => $cache->email,
            'source' => 'IDX',
            'raw_source_payload' => $cache->raw_payload_json,
        ];
    }
}
