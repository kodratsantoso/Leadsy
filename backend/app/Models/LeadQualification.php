<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadQualification extends Model
{
    protected $fillable = [
        'lead_id', 'qualified', 'business_type', 'company_size_band',
        'qualification_reason', 'last_qualified_at',
        'classification', 'score', 'dimension_breakdown', 'risk_flags',
        'hard_stops', 'recommendation', 'evaluation_snapshot',
    ];

    protected $casts = [
        'last_qualified_at' => 'datetime',
        'dimension_breakdown' => 'array',
        'risk_flags' => 'array',
        'hard_stops' => 'array',
        'evaluation_snapshot' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function workflowReviews(): HasMany
    {
        return $this->hasMany(QualificationWorkflowReview::class, 'lead_qualification_id');
    }
}
