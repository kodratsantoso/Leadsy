<?php

namespace App\Services\Idx;

use App\Models\IdxCompanyCache;
use Illuminate\Pagination\LengthAwarePaginator;

class IdxCompanyDiscoveryService
{
    public function search(array $filters, int $perPage = 50, ?array $duplicateIdxCodes = null): LengthAwarePaginator
    {
        $query = IdxCompanyCache::query();

        if (!empty($filters['keyword'])) {
            $keyword = '%' . strtolower($filters['keyword']) . '%';
            $query->where(function ($q) use ($keyword) {
                $q->whereRaw('LOWER(idx_code) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(company_name) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(industry) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(sub_industry) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(sector) LIKE ?', [$keyword])
                  ->orWhereRaw('LOWER(listing_board) LIKE ?', [$keyword]);
            });
        }

        if (!empty($filters['sector'])) {
            $query->where('sector', $filters['sector']);
        }

        if (!empty($filters['listing_board'])) {
            $query->where('listing_board', $filters['listing_board']);
        }

        if (!empty($filters['industry'])) {
            $query->where('industry', $filters['industry']);
        }

        if (!empty($filters['sub_industry'])) {
            $query->where('sub_industry', $filters['sub_industry']);
        }

        // Filter by duplicate status: 'new' or 'in_leads'
        $status = $filters['status'] ?? 'all';
        if ($duplicateIdxCodes !== null) {
            if ($status === 'in_leads') {
                $query->whereIn('idx_code', $duplicateIdxCodes);
            } elseif ($status === 'new') {
                $query->whereNotIn('idx_code', $duplicateIdxCodes);
            }
        }

        return $query->orderBy('idx_code', 'asc')->paginate($perPage);
    }

    public function getFilters(): array
    {
        $sectors = IdxCompanyCache::whereNotNull('sector')
            ->select('sector')
            ->distinct()
            ->orderBy('sector')
            ->pluck('sector')
            ->toArray();

        $listingBoards = IdxCompanyCache::whereNotNull('listing_board')
            ->select('listing_board')
            ->distinct()
            ->orderBy('listing_board')
            ->pluck('listing_board')
            ->toArray();

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
            'sectors' => $sectors,
            'listing_boards' => $listingBoards,
            'industries' => $industries,
            'sub_industries' => $subIndustries,
        ];
    }
}
