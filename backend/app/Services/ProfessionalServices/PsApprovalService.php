<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsApprovalLog;
use App\Models\LeadActivity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PsApprovalService
{
    private PsBlockerValidationService $blockerService;
    private PsVersioningService $versioningService;

    public function __construct(PsBlockerValidationService $blockerService, PsVersioningService $versioningService)
    {
        $this->blockerService = $blockerService;
        $this->versioningService = $versioningService;
    }

    public function submitForApproval(PsEstimation $estimation, ?int $userId, ?string $comment = null): void
    {
        $blockers = $this->blockerService->getBlockers($estimation);
        if (!empty($blockers)) {
            throw ValidationException::withMessages([
                'blockers' => 'Cannot submit for approval due to unresolved blockers.',
                'blocker_details' => $blockers
            ]);
        }

        DB::transaction(function () use ($estimation, $userId, $comment) {
            $oldStatus = $estimation->status;
            $estimation->status = 'pending_approval';
            $estimation->version_number += 1;
            $estimation->save();

            $this->logAction($estimation, 'submit', $oldStatus, 'pending_approval', $userId, $comment);
            
            $this->versioningService->createSnapshot($estimation, 'Submitted for Approval', $comment, $userId);
            
            $this->createLeadActivity($estimation, $userId, 'status', 'Submitted PS Estimation for Approval');
        });
    }

    public function approve(PsEstimation $estimation, ?int $userId, ?string $comment = null): void
    {
        if ($estimation->status !== 'pending_approval' && $estimation->status !== 'pm_reviewed') {
            throw ValidationException::withMessages(['status' => 'Estimation must be pending approval.']);
        }

        $blockers = $this->blockerService->getBlockers($estimation);
        if (!empty($blockers)) {
            throw ValidationException::withMessages([
                'blockers' => 'Cannot approve due to unresolved blockers.',
                'blocker_details' => $blockers
            ]);
        }

        DB::transaction(function () use ($estimation, $userId, $comment) {
            $oldStatus = $estimation->status;
            $estimation->status = 'approved';
            $estimation->approved_by = $userId;
            $estimation->approved_at = now();
            // Approval locks the version, so we bump version only if it's not pending_approval (where we already bumped)
            if ($oldStatus !== 'pending_approval') {
                $estimation->version_number += 1;
            }
            $estimation->save();

            $this->logAction($estimation, 'approve', $oldStatus, 'approved', $userId, $comment);
            
            $this->versioningService->createSnapshot($estimation, 'Approved', $comment, $userId);
            
            $this->createLeadActivity($estimation, $userId, 'status', 'Approved PS Estimation');
        });
    }

    public function reject(PsEstimation $estimation, ?int $userId, string $reason): void
    {
        if ($estimation->status !== 'pending_approval') {
            throw ValidationException::withMessages(['status' => 'Estimation must be pending approval to be rejected.']);
        }

        DB::transaction(function () use ($estimation, $userId, $reason) {
            $oldStatus = $estimation->status;
            $estimation->status = 'rejected';
            $estimation->save();

            $this->logAction($estimation, 'reject', $oldStatus, 'rejected', $userId, null, $reason);
            
            $this->createLeadActivity($estimation, $userId, 'status', 'Rejected PS Estimation', "Reason: $reason");
        });
    }

    public function requestRevision(PsEstimation $estimation, ?int $userId, string $reason): void
    {
        if (!in_array($estimation->status, ['pending_approval', 'pm_reviewed', 'rejected'])) {
            throw ValidationException::withMessages(['status' => 'Cannot request revision in current status.']);
        }

        DB::transaction(function () use ($estimation, $userId, $reason) {
            $oldStatus = $estimation->status;
            $estimation->status = 'revision_required';
            $estimation->save();

            $this->logAction($estimation, 'request_revision', $oldStatus, 'revision_required', $userId, null, $reason);
            
            $this->createLeadActivity($estimation, $userId, 'status', 'Requested Revision for PS Estimation', "Reason: $reason");
        });
    }

    private function logAction(PsEstimation $estimation, string $action, string $fromStatus, string $toStatus, ?int $userId, ?string $comment = null, ?string $reason = null): void
    {
        PsApprovalLog::create([
            'estimation_id' => $estimation->id,
            'version_number' => $estimation->version_number,
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'actor_id' => $userId,
            'comment' => $comment,
            'reason' => $reason,
        ]);
    }

    private function createLeadActivity(PsEstimation $estimation, ?int $userId, string $type, string $title, ?string $description = null): void
    {
        if (!$estimation->lead_id) return;

        LeadActivity::create([
            'lead_id' => $estimation->lead_id,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'description' => $description ?? "Estimation {$estimation->estimation_number}",
            'related_entity_type' => PsEstimation::class,
            'related_entity_id' => $estimation->id,
        ]);
    }
}
