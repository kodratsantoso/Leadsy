<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $workflow_id
 * @property int|null $lead_id
 * @property int|null $lead_qualification_id
 * @property string $status
 * @property string|null $current_stage_code
 * @property string|null $recommended_status
 * @property string|null $final_status
 * @property int|null $requested_by
 * @property int|null $reviewed_by
 * @property string|null $justification
 * @property string|null $override_reason
 * @property array<array-key, mixed>|null $review_payload
 * @property \Illuminate\Support\Carbon|null $due_at
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property string|null $decision
 * @property string|null $decision_reason
 * @property int|null $original_score
 * @property int|null $score_override
 * @property \Illuminate\Support\Carbon|null $decisioned_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\LeadQualification|null $qualification
 * @property-read \App\Models\User|null $requester
 * @property-read \App\Models\User|null $reviewer
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\QualificationWorkflow|null $workflow
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereCurrentStageCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereDecision($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereDecisionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereDecisionedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereDueAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereFinalStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereJustification($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereLeadQualificationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereOriginalScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereOverrideReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereRecommendedStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereRequestedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereReviewPayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereScoreOverride($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowReview whereWorkflowId($value)
 * @mixin \Eloquent
 */
class QualificationWorkflowReview extends Model
{
    protected $fillable = [
        'tenant_id', 'workflow_id', 'lead_id', 'lead_qualification_id', 'status',
        'decision', 'current_stage_code', 'recommended_status', 'final_status',
        'requested_by', 'reviewed_by', 'justification', 'override_reason',
        'decision_reason', 'original_score', 'score_override',
        'review_payload', 'due_at', 'reviewed_at', 'decisioned_at',
    ];

    protected $casts = [
        'review_payload' => 'array',
        'original_score' => 'integer',
        'score_override' => 'integer',
        'due_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'decisioned_at' => 'datetime',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(QualificationWorkflow::class, 'workflow_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function qualification(): BelongsTo
    {
        return $this->belongsTo(LeadQualification::class, 'lead_qualification_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
