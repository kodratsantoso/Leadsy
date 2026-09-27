<?php

namespace App\Services\Idx;

use App\Models\IdxCompanyCache;
use Illuminate\Support\Facades\Storage;

class IdxCompanyCacheService
{
    /**
     * Where the shipped IDX dataset can be found, best first.
     *
     * It used to live only under storage/, which is exactly where it could not survive:
     * the production pod mounts a volume over /var/www/html/storage, and the init
     * container creates only the four framework directories. The file is in the image —
     * .dockerignore never excluded it — but the mount hides it, so file_exists() is false
     * in production and the cache silently never populates. database/ carries no mount,
     * so the dataset lives there now; the storage path is kept as a fallback for installs
     * that already put a copy there.
     */
    public const DATASET_PATHS = [
        'database/data/idx/allCompanies.json',
        'storage/app/data/idx/allCompanies.json',
    ];

    /** The dataset file actually present on this install, or null when none is. */
    public function datasetPath(): ?string
    {
        foreach (self::DATASET_PATHS as $relative) {
            $path = base_path($relative);
            if (is_readable($path)) {
                return $path;
            }
        }

        return null;
    }

    public function refreshCacheFromLocal(): int
    {
        $path = $this->datasetPath();
        if ($path === null) {
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
