<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPreMeetingBrief extends Model
{
    protected $fillable = [
        'lead_id',
        'product_id',
        'summary_json',
        'objective_hypothesis_json',
        'strategy_json',
        'questions_json',
        'demo_strategy_json',
        'bantc_pre_json',
        'pain_point_json',
        'risk_analysis_json',
        'readiness_score',
        'ai_provider',
        'ai_model',
    ];

    protected $casts = [
        'summary_json' => 'array',
        'objective_hypothesis_json' => 'array',
        'strategy_json' => 'array',
        'questions_json' => 'array',
        'demo_strategy_json' => 'array',
        'bantc_pre_json' => 'array',
        'pain_point_json' => 'array',
        'risk_analysis_json' => 'array',
        'readiness_score' => 'integer',
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
