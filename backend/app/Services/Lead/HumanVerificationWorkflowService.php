<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\QualificationWorkflow;
use App\Models\QualificationWorkflowReview;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class HumanVerificationWorkflowService
{
    public function __construct(private readonly LeadScoringService $scoringService)
    {
    }

    public function requestReview(Lead $lead, User $requester, array $input = []): QualificationWorkflowReview
    {
        $workflow = $this->activeWorkflowFor($lead);

        if (! $workflow) {
            throw ValidationException::withMessages([
                'workflow' => 'No active human verification workflow is configured.',
            ]);
        }

        $existing = $lead->qualificationWorkflowReviews()
            ->whereIn('status', ['pending', 'in_review'])
            ->latest()
            ->first();

        if ($existing) {
            return $existing->load(['workflow.stages', 'requester', 'reviewer', 'lead', 'qualification']);
        }

        $latestQualification = $lead->qualifications()->latest()->first();
        $firstStage = $workflow->stages()->orderBy('sequence')->first();
        $dueAt = $workflow->sla_hours ? Carbon::now()->addHours($workflow->sla_hours) : null;

        $review = QualificationWorkflowReview::create([
            'tenant_id' => $lead->tenant_id,
            'workflow_id' => $workflow->id,
            'lead_id' => $lead->id,
            'lead_qualification_id' => $latestQualification?->id,
            'status' => 'pending',
            'decision' => 'pending',
            'current_stage_code' => $firstStage?->code,
            'recommended_status' => $input['recommended_status']
                ?? $latestQualification?->classification
                ?? $lead->qualification_status,
            'requested_by' => $requester->id,
            'justification' => $input['justification']
                ?? 'Human verification required before pipeline progression.',
            'review_payload' => $this->buildPayloadSnapshot($lead, $latestQualification),
            'due_at' => $input['due_at'] ?? $dueAt,
        ]);

        AuditService::log('verification_requested', 'qualification_workflow_reviews', $review, null, [
            'lead_id' => $lead->id,
            'workflow_id' => $workflow->id,
            'recommended_status' => $review->recommended_status,
        ]);

        return $review->load(['workflow.stages', 'requester', 'reviewer', 'lead', 'qualification']);
    }

    public function decide(QualificationWorkflowReview $review, User $reviewer, array $input): QualificationWorkflowReview
    {
        $decision = $input['decision'];
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => 'A decision reason is required.',
            ]);
        }

        $review->loadMissing('lead', 'workflow.stages', 'qualification');

        $original = $review->toArray();
        $status = match ($decision) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'hold' => 'in_review',
            'override_score' => 'overridden',
            default => throw ValidationException::withMessages([
                'decision' => 'Unsupported verification decision.',
            ]),
        };

        $finalStatus = $review->final_status;
        if ($decision === 'approve') {
            $finalStatus = $input['final_status']
                ?? $review->recommended_status
                ?? 'eligible';
        } elseif ($decision === 'reject') {
            $finalStatus = $input['final_status'] ?? 'not_eligible';
        } elseif ($decision === 'hold') {
            $finalStatus = $input['final_status'] ?? $review->final_status ?? 'pending';
        }

        $update = [
            'status' => $status,
            'decision' => $decision,
            'final_status' => $finalStatus,
            'decision_reason' => $reason,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'decisioned_at' => now(),
            'current_stage_code' => $input['current_stage_code'] ?? $review->current_stage_code,
        ];

        if ($decision === 'override_score') {
            $overrideScore = (int) ($input['score_override'] ?? -1);
            if ($overrideScore < 0 || $overrideScore > 100) {
                throw ValidationException::withMessages([
                    'score_override' => 'Score override must be between 0 and 100.',
                ]);
            }

            $originalScore = $review->lead->lead_score;
            $this->scoringService->applyManualOverride($review->lead, $overrideScore, $reason, $reviewer);

            $update['original_score'] = $originalScore;
            $update['score_override'] = $overrideScore;
            $update['override_reason'] = $reason;
            $update['status'] = 'in_review';
        }

        $review->update($update);

        if (in_array($decision, ['approve', 'reject'], true) && $review->lead) {
            $review->lead->update([
                'qualification_status' => $finalStatus,
            ]);
        }

        $review->refresh();

        AuditService::log('verification_decision', 'qualification_workflow_reviews', $review, $original, [
            'decision' => $decision,
            'lead_id' => $review->lead_id,
            'score_override' => $review->score_override,
            'final_status' => $review->final_status,
        ]);

        return $review->load(['workflow.stages', 'requester', 'reviewer', 'lead', 'qualification']);
    }

    public function latestReviewFor(Lead $lead): ?QualificationWorkflowReview
    {
        return $lead->qualificationWorkflowReviews()
            ->with(['workflow.stages', 'requester', 'reviewer', 'qualification'])
            ->latest()
            ->first();
    }

    public function queueQuery()
    {
        return QualificationWorkflowReview::query()
            ->with(['workflow.stages', 'lead', 'qualification', 'requester', 'reviewer']);
    }

    public function verificationSnapshot(Lead $lead): array
    {
        $latestReview = $this->latestReviewFor($lead);
        $workflow = $this->activeWorkflowFor($lead);
        $requiresVerification = (bool) $workflow?->requires_approval;
        $verified = $latestReview?->status === 'approved';

        return [
            'requires_verification' => $requiresVerification,
            'verified_for_pipeline' => $verified,
            'blocked_from_pipeline' => $requiresVerification && ! $verified,
            'workflow' => $workflow,
            'latest_review' => $latestReview,
        ];
    }

    private function activeWorkflowFor(Lead $lead): ?QualificationWorkflow
    {
        return QualificationWorkflow::query()
            ->when(
                $lead->tenant_id,
                fn ($query) => $query->where(function ($inner) use ($lead) {
                    $inner->where('tenant_id', $lead->tenant_id)
                        ->orWhereNull('tenant_id');
                }),
                fn ($query) => $query->whereNull('tenant_id')
            )
            ->where('is_active', true)
            ->where('requires_approval', true)
            ->orderByDesc('id')
            ->first();
    }

    private function buildPayloadSnapshot(Lead $lead, $latestQualification): array
    {
        return [
            'lead_score' => $lead->lead_score,
            'qualification_status' => $lead->qualification_status,
            'ai_explanation' => $lead->ai_explanation,
            'current_funnel_stage_id' => $lead->funnel_stage_id,
            'current_funnel_stage' => $lead->funnelStage?->name,
            'latest_qualification' => $latestQualification?->only([
                'id',
                'qualified',
                'classification',
                'score',
                'business_type',
                'company_size_band',
                'qualification_reason',
            ]),
        ];
    }
}
