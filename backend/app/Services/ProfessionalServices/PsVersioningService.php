<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsEstimationVersion;
use App\Models\PsRevision;
use Illuminate\Support\Facades\DB;

class PsVersioningService
{
    private EstimationCalculationService $calculationService;

    public function __construct(EstimationCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Create an immutable JSON snapshot of the current estimation state.
     */
    public function createSnapshot(PsEstimation $estimation, string $label, string $reason = null, ?int $userId = null): PsEstimationVersion
    {
        // Refresh with all relationships needed for a complete snapshot
        $estimation->load([
            'lines.role',
            'lines.complexityLevel',
            'category',
            'template',
            'complexityLevel',
            'creator',
            'reviewer',
            'approver'
        ]);

        return PsEstimationVersion::create([
            'estimation_id' => $estimation->id,
            'version_number' => $estimation->version_number,
            'version_label' => $label,
            'change_reason' => $reason,
            'snapshot_json' => $estimation->toArray(),
            'created_by' => $userId,
        ]);
    }

    /**
     * Branch off an approved/locked estimation into a new Draft revision.
     */
    public function createRevision(PsEstimation $original, string $reason, ?int $userId = null): PsEstimation
    {
        return DB::transaction(function () use ($original, $reason, $userId) {
            // Duplicate the estimation structure
            $revision = $this->calculationService->duplicateEstimation($original, $userId);
            
            // Adjust specific revision fields
            $revision->status = 'draft';
            $revision->parent_estimation_id = $original->id;
            $revision->version_number = 1;
            // Unset approval tracking for the new revision
            $revision->reviewed_by = null;
            $revision->reviewed_at = null;
            $revision->approved_by = null;
            $revision->approved_at = null;
            $revision->converted_quotation_id = null;
            $revision->converted_at = null;
            $revision->converted_by = null;
            $revision->save();

            // Record the revision link
            $revNumber = PsRevision::where('original_estimation_id', $original->id)->max('revision_number') ?? 0;
            
            PsRevision::create([
                'original_estimation_id' => $original->id,
                'revised_estimation_id' => $revision->id,
                'revision_number' => $revNumber + 1,
                'revision_reason' => $reason,
                'created_by' => $userId,
            ]);

            return $revision;
        });
    }
}
