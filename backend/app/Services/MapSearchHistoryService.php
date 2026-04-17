<?php

namespace App\Services;

use App\Models\MapSearchHistory;
use Illuminate\Support\Facades\Log;

class MapSearchHistoryService
{
    /**
     * Log a new search action.
     */
    public function logSearch(array $data, ?int $userId): void
    {
        try {
            MapSearchHistory::create([
                'area_name'     => $data['area_name'] ?? 'Unknown',
                'area_place_id' => $data['area_place_id'] ?? null,
                'area_lat'      => $data['area_lat'] ?? null,
                'area_lng'      => $data['area_lng'] ?? null,
                'keyword'       => $data['keyword'] ?? null,
                'category'      => $data['category'] ?? null,
                'search_mode'   => $data['search_mode'] ?? 'nearby',
                'radius_meters' => $data['radius_meters'] ?? null,
                'result_count'  => $data['result_count'] ?? 0,
                'created_by'    => $userId,
            ]);
        } catch (\Throwable $e) {
            // Non-critical operation, just log and continue
            Log::warning('[MapSearchHistory] Failed to log search', ['error' => $e->getMessage()]);
        }
    }
}
