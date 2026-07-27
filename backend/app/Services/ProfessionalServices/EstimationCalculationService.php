<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsEstimationLine;
use App\Models\PsRole;
use Illuminate\Support\Str;

class EstimationCalculationService
{
    /**
     * Recalculates the entire estimation and its lines.
     */
    public function recalculate(PsEstimation $estimation): void
    {
        $totalBase = 0;
        $totalAdjusted = 0;
        $totalBuffer = 0;
        $totalManual = 0;
        $totalFinal = 0;
        $totalFee = 0;

        $multiplier = $estimation->complexity_multiplier ?? 1.0;
        $bufferPercentage = $estimation->buffer_percentage ?? 0.0;

        foreach ($estimation->lines as $line) {
            $this->calculateLine($line, $multiplier, $bufferPercentage);

            $totalBase += $line->base_mandays;
            $totalAdjusted += $line->adjusted_mandays;
            $totalBuffer += $line->buffer_mandays;
            $totalManual += $line->manual_adjustment;
            $totalFinal += $line->final_mandays;
            $totalFee += $line->estimated_fee;
        }

        $estimation->total_base_mandays = $totalBase;
        $estimation->total_adjusted_mandays = $totalAdjusted;
        $estimation->total_buffer_mandays = $totalBuffer;
        $estimation->total_manual_adjustment_mandays = $totalManual;
        $estimation->total_final_mandays = $totalFinal;
        $estimation->total_estimated_fee = $totalFee;

        $estimation->save();
    }

    /**
     * Calculates a single line based on the estimation's configuration.
     */
    private function calculateLine(PsEstimationLine $line, float $multiplier, float $bufferPercentage): void
    {
        $line->adjusted_mandays = round($line->base_mandays * $multiplier, 2);
        $line->buffer_mandays = round($line->adjusted_mandays * ($bufferPercentage / 100), 2);
        
        $line->final_mandays = $line->adjusted_mandays + $line->buffer_mandays + $line->manual_adjustment;

        // Take snapshot of rate if role exists
        if ($line->role_id) {
            $role = PsRole::find($line->role_id);
            if ($role) {
                $rateCard = $role->currentRateCard();
                if ($rateCard) {
                    $line->rate_snapshot = $rateCard->rate_per_manday;
                }
            }
        }

        $line->estimated_fee = round($line->final_mandays * $line->rate_snapshot, 2);
        
        // Save silently to avoid triggering events recursively if called from an observer
        $line->saveQuietly();
    }

    /**
     * Generates a unique estimation number.
     */
    public function generateEstimationNumber(): string
    {
        $prefix = 'PS-EST-' . date('Ymd') . '-';
        $lastEstimation = PsEstimation::where('estimation_number', 'like', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        $sequence = 1;
        if ($lastEstimation) {
            $lastSequence = (int) str_replace($prefix, '', $lastEstimation->estimation_number);
            $sequence = $lastSequence + 1;
        }

        return $prefix . str_pad((string)$sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Clones an estimation to a new draft.
     */
    public function duplicateEstimation(PsEstimation $original, int $userId): PsEstimation
    {
        $newEstimation = $original->replicate();
        $newEstimation->estimation_number = $this->generateEstimationNumber();
        $newEstimation->title = 'Copy of ' . $original->title;
        $newEstimation->status = 'draft';
        $newEstimation->created_by = $userId;
        $newEstimation->reviewed_by = null;
        $newEstimation->approved_by = null;
        $newEstimation->reviewed_at = null;
        $newEstimation->approved_at = null;
        $newEstimation->save();

        foreach ($original->lines as $line) {
            $newLine = $line->replicate();
            $newLine->estimation_id = $newEstimation->id;
            $newLine->save();
        }

        $this->recalculate($newEstimation);

        return $newEstimation;
    }
}
