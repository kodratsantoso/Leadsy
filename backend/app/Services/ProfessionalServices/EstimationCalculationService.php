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

        // First, calculate all subtasks
        $subtasks = $estimation->lines()->whereNotNull('parent_task_id')->get();
        $parentTaskTotals = []; // To store sums for parent tasks

        foreach ($subtasks as $subtask) {
            $this->calculateLine($subtask, $multiplier, $bufferPercentage);
            
            if (!isset($parentTaskTotals[$subtask->parent_task_id])) {
                $parentTaskTotals[$subtask->parent_task_id] = [
                    'base_mandays' => 0,
                    'adjusted_mandays' => 0,
                    'buffer_mandays' => 0,
                    'manual_adjustment' => 0,
                    'final_mandays' => 0,
                    'estimated_fee' => 0,
                ];
            }
            
            $parentTaskTotals[$subtask->parent_task_id]['base_mandays'] += $subtask->base_mandays;
            $parentTaskTotals[$subtask->parent_task_id]['adjusted_mandays'] += $subtask->adjusted_mandays;
            $parentTaskTotals[$subtask->parent_task_id]['buffer_mandays'] += $subtask->buffer_mandays;
            $parentTaskTotals[$subtask->parent_task_id]['manual_adjustment'] += $subtask->manual_adjustment;
            $parentTaskTotals[$subtask->parent_task_id]['final_mandays'] += $subtask->final_mandays;
            $parentTaskTotals[$subtask->parent_task_id]['estimated_fee'] += $subtask->estimated_fee;
        }

        // Now, calculate parent tasks
        $tasks = $estimation->lines()->whereNull('parent_task_id')->get();
        
        foreach ($tasks as $task) {
            // If task has subtasks, override its values with the rolled-up totals
            if (isset($parentTaskTotals[$task->id])) {
                $totals = $parentTaskTotals[$task->id];
                $task->base_mandays = $totals['base_mandays'];
                // We still want to let calculateLine run if we want to apply parent-level complexity/buffer?
                // Actually, if a task has subtasks, the values should just be the sum of subtasks.
                $task->adjusted_mandays = $totals['adjusted_mandays'];
                $task->buffer_mandays = $totals['buffer_mandays'];
                $task->manual_adjustment = $totals['manual_adjustment'];
                $task->final_mandays = $totals['final_mandays'];
                $task->estimated_fee = $totals['estimated_fee'];
                $task->saveQuietly();
            } else {
                // Leaf task (no subtasks), calculate normally
                $this->calculateLine($task, $multiplier, $bufferPercentage);
            }

            $totalBase += $task->base_mandays;
            $totalAdjusted += $task->adjusted_mandays;
            $totalBuffer += $task->buffer_mandays;
            $totalManual += $task->manual_adjustment;
            $totalFinal += $task->final_mandays;
            $totalFee += $task->estimated_fee;
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
        // Priority: Line-specific complexity multiplier > Estimation complexity multiplier
        $lineMultiplier = $line->complexity_multiplier_snapshot ?? $multiplier;
        if ($line->complexity_level_id && !$line->complexity_multiplier_snapshot) {
            $lineMultiplier = $line->complexityLevel ? $line->complexityLevel->multiplier : $multiplier;
            $line->complexity_multiplier_snapshot = $lineMultiplier;
        }

        // Priority: Line-specific buffer > Estimation buffer
        $lineBuffer = $line->buffer_percentage_snapshot ?? $bufferPercentage;

        $line->adjusted_mandays = round($line->base_mandays * $lineMultiplier, 2);
        $line->buffer_mandays = round($line->adjusted_mandays * ($lineBuffer / 100), 2);
        
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

        // Need to replicate hierarchy. First replicate tasks, then subtasks
        $tasks = $original->lines()->whereNull('parent_task_id')->get();
        foreach ($tasks as $task) {
            $newTask = $task->replicate();
            $newTask->estimation_id = $newEstimation->id;
            $newTask->save();

            $subtasks = $original->lines()->where('parent_task_id', $task->id)->get();
            foreach ($subtasks as $subtask) {
                $newSubtask = $subtask->replicate();
                $newSubtask->estimation_id = $newEstimation->id;
                $newSubtask->parent_task_id = $newTask->id;
                $newSubtask->save();
            }
        }

        $this->recalculate($newEstimation);

        return $newEstimation;
    }
}
