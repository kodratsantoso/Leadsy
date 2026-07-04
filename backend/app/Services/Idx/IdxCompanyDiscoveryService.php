<?php

namespace App\Services\Idx;

use App\Models\IdxCompanyCache;
use Illuminate\Pagination\LengthAwarePaginator;

class IdxCompanyDiscoveryService
{
    public function search(array $filters, int $perPage = 50): LengthAwarePaginator
    {
        $query = IdxCompanyCache::query();

        if (!empty($filters['keyword'])) {
            $keyword = '%' . strtolower($filters['keyword']) . '%';
            $query->where(function ($q) use ($keyword) {
                $q->whereRaw('LOWER(idx_code) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(company_name) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(industry) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(sub_industry) LIKE ?', [$keyword]);
            });
        }

        if (!empty($filters['industry'])) {
            $query->where('industry', $filters['industry']);
        }

        if (!empty($filters['sub_industry'])) {
            $query->where('sub_industry', $filters['sub_industry']);
        }

        return $query->orderBy('idx_code', 'asc')->paginate($perPage);
    }

    public function getFilters(): array
    {
        $industries = IdxCompanyCache::whereNotNull('industry')
            ->select('industry')
            ->distinct()
            ->orderBy('industry')
            ->pluck('industry')
            ->toArray();

        $subIndustries = IdxCompanyCache::whereNotNull('sub_industry')
            ->select('sub_industry')
            ->distinct()
            ->orderBy('sub_industry')
            ->pluck('sub_industry')
            ->toArray();

        return [
            'industries' => $industries,
            'sub_industries' => $subIndustries,
        ];
    }
}
