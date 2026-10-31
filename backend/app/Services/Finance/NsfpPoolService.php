<?php

namespace App\Services\Finance;

use App\Models\NsfpPool;
use Exception;
use Illuminate\Support\Facades\DB;

class NsfpPoolService
{
    /**
     * Atomically allocate the next available sequential NSFP number.
     * Throws an exception if no active pool has remaining quota.
     */
    public function allocateNextNsfp(string $taxYear = '2026'): string
    {
        return DB::transaction(function () use ($taxYear) {
            $pool = NsfpPool::where('is_active', true)
                ->where('tax_year', $taxYear)
                ->whereRaw('current_number <= end_number')
                ->lockForUpdate()
                ->first();

            if (!$pool) {
                // Fallback to any active pool regardless of tax year
                $pool = NsfpPool::where('is_active', true)
                    ->whereRaw('current_number <= end_number')
                    ->lockForUpdate()
                    ->first();
            }

            if (!$pool) {
                throw new Exception("Kuota Nomor Seri Faktur Pajak (NSFP) telah habis. Silakan tambahkan rentang nomor NSFP baru dari DJP e-Nofa di menu Finance Hub.");
            }

            $allocatedNumber = $pool->current_number;
            $formattedNumber = str_pad((string)$allocatedNumber, 8, '0', STR_PAD_LEFT);
            $fullNsfp = $pool->prefix . $formattedNumber;

            // Increment pool counter
            $pool->current_number = $allocatedNumber + 1;
            $pool->total_used = $pool->total_used + 1;

            if ($pool->current_number > $pool->end_number) {
                $pool->is_active = false; // Exhausted
            }

            $pool->save();

            return $fullNsfp;
        });
    }

    /**
     * Add a new NSFP pool batch from DJP e-Nofa.
     */
    public function addPoolRange(string $taxYear, string $prefix, int $startNumber, int $endNumber, ?string $notes = null): NsfpPool
    {
        if ($endNumber < $startNumber) {
            throw new Exception("Nomor akhir NSFP tidak boleh lebih kecil dari nomor awal.");
        }

        $total = ($endNumber - $startNumber) + 1;

        return NsfpPool::create([
            'tax_year' => $taxYear,
            'prefix' => $prefix,
            'start_number' => $startNumber,
            'end_number' => $endNumber,
            'current_number' => $startNumber,
            'total_allocated' => $total,
            'total_used' => 0,
            'is_active' => true,
            'notes' => $notes,
        ]);
    }

    /**
     * Get aggregate statistics on NSFP quota.
     */
    public function getPoolSummary(): array
    {
        $pools = NsfpPool::orderBy('id', 'desc')->get();
        $totalAllocated = $pools->sum('total_allocated');
        $totalUsed = $pools->sum('total_used');
        $remaining = max(0, $totalAllocated - $totalUsed);

        return [
            'total_allocated' => $totalAllocated,
            'total_used' => $totalUsed,
            'remaining' => $remaining,
            'pools' => $pools,
        ];
    }
}
