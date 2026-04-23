<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
