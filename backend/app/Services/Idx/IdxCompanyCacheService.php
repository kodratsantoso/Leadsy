<?php

namespace App\Services\Idx;

use App\Models\IdxCompanyCache;
use Illuminate\Support\Facades\Storage;

class IdxCompanyCacheService
{
    public function refreshCacheFromLocal(): int
    {
        $path = storage_path('app/data/idx/allCompanies.json');
        if (!file_exists($path)) {
            return 0;
        }

        $json = json_decode(file_get_contents($path), true);
        $companies = $json['data'] ?? [];
        $count = 0;

        foreach ($companies as $c) {
            if (empty($c['KodeEmiten'])) continue;
            
            $website = $c['Website'] ?? null;
            if ($website && !str_starts_with($website, 'http')) {
                $website = 'https://' . ltrim($website, '/');
            }

            IdxCompanyCache::updateOrCreate(
                ['idx_code' => $c['KodeEmiten']],
                [
                    'company_name' => $c['NamaEmiten'] ?? '',
                    'industry' => $c['Industri'] ?? null,
                    'sub_industry' => $c['SubIndustri'] ?? null,
                    'sector' => $c['Sektor'] ?? null,
                    'listing_board' => $c['PapanPencatatan'] ?? null,
                    'website' => $website,
                    'phone' => $c['Telepon'] ?? null,
                    'email' => $c['Email'] ?? null,
                    'address' => $c['Alamat'] ?? null,
                    'raw_payload_json' => $c,
                    'last_fetched_at' => now(),
                ]
            );
            $count++;
        }
        return $count;
    }
}
