<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_name', 'address', 'lat', 'lng',
        'website', 'website_domain', 'phone', 'email',
        'industry_id', 'sub_industry_id', 'business_category',
        'company_size_estimate', 'branch_count', 'operating_hours',
        'social_profiles',
        'lead_score', 'qualification_status', 'ai_explanation',
        'duplicate_status', 'duplicate_of_id', 'external_place_id',
        'use_ai_reference', 'ai_mode', 'ai_reference_source_type',
        'ai_reference_id', 'ai_processing_status',
        'funnel_stage_id', 'owner_id',
        'territory_id', 'product_id', 'created_by',
    ];

    protected $casts = [
        'lat'              => 'float',
        'lng'              => 'float',
        'social_profiles'  => 'array',
        'lead_score'       => 'integer',
        'use_ai_reference' => 'boolean',
        'branch_count'     => 'integer',
    ];

    /* ── Relationships ── */

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function subIndustry(): BelongsTo
    {
        return $this->belongsTo(SubIndustry::class);
    }

    public function funnelStage(): BelongsTo
    {
        return $this->belongsTo(FunnelStage::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function territory(): BelongsTo
    {
        return $this->belongsTo(Territory::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(LeadContact::class);
    }

    public function sources(): HasMany
    {
        return $this->hasMany(LeadSource::class);
    }

    public function funnelHistory(): HasMany
    {
        return $this->hasMany(LeadFunnelHistory::class);
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicate_of_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /* ── Intelligence & Activity Engine ── */

    public function scores(): HasMany
    {
        return $this->hasMany(LeadScore::class);
    }

    public function qualifications(): HasMany
    {
        return $this->hasMany(LeadQualification::class);
    }

    public function productMatches(): HasMany
    {
        return $this->hasMany(LeadProductMatch::class);
    }

    public function aiAnalyses(): HasMany
    {
        return $this->hasMany(LeadAiAnalysis::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class);
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(LeadMeeting::class);
    }

    public function transcripts(): HasMany
    {
        return $this->hasMany(LeadTranscript::class);
    }

    public function aiEvaluations(): HasMany
    {
        return $this->hasMany(LeadAiEvaluation::class);
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(LeadFollowUp::class);
    }

    /* ── Revenue Intelligence Engine ── */

    public function icpMatches(): HasMany
    {
        return $this->hasMany(LeadIcpMatch::class);
    }

    public function conversionPredictions(): HasMany
    {
        return $this->hasMany(LeadConversionPrediction::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(LeadPrescription::class);
    }

    public function outcomes(): HasMany
    {
        return $this->hasMany(LeadOutcome::class);
    }

    public function revenueAnalyses(): HasMany
    {
        return $this->hasMany(LeadRevenueAnalysis::class);
    }
}
