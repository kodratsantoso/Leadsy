<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPreMeetingBrief extends Model
{
    protected $fillable = [
        'lead_id',
        'product_id',
        'meeting_type',
        'input_context_json',
        'customer_snapshot_json',
        'meeting_context_json',
        'needs_pain_hypothesis_json',
        'product_fit_hypothesis_json',
        'bantc_discovery_plan_json',
        'demo_strategy_json',
        'stakeholder_strategy_json',
        'risk_flags_json',
        'recommended_meeting_approach_json',
        'readiness_score',
        'readiness_status',
        'data_completeness_score',
        'executive_brief',
        'ai_provider',
        'ai_model',
        'prompt_version',
        'generated_by',
        'generated_at',
    ];

    protected $casts = [
        'input_context_json' => 'array',
        'customer_snapshot_json' => 'array',
        'meeting_context_json' => 'array',
        'needs_pain_hypothesis_json' => 'array',
        'product_fit_hypothesis_json' => 'array',
        'bantc_discovery_plan_json' => 'array',
        'demo_strategy_json' => 'array',
        'stakeholder_strategy_json' => 'array',
        'risk_flags_json' => 'array',
        'recommended_meeting_approach_json' => 'array',
        'readiness_score' => 'integer',
        'data_completeness_score' => 'integer',
        'generated_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
