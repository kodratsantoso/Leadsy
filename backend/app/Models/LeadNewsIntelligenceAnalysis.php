<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadNewsIntelligenceAnalysis extends Model
{
    use HasFactory;

    protected $table = 'lead_news_intelligence_analyses';

    protected $fillable = [
        'lead_id',
        'tenant_id',
        'business_summary',
        'business_outlook',
        'opportunity_signals',
        'risk_signals',
        'product_recommendations',
        'pitching_recommendations',
        'bantc_hypotheses',
        'discovery_questions',
        'confidence',
        'raw_ai_response',
    ];

    protected $casts = [
        'opportunity_signals' => 'array',
        'risk_signals' => 'array',
        'product_recommendations' => 'array',
        'pitching_recommendations' => 'array',
        'bantc_hypotheses' => 'array',
        'discovery_questions' => 'array',
        'confidence' => 'integer',
        'raw_ai_response' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
