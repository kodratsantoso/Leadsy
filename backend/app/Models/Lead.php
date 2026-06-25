<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_name', 'address', 'lat', 'lng',
        'website', 'website_domain', 'phone', 'email',
        'industry_id', 'sub_industry_id', 'business_category', 'business_category_id',
        'company_size_estimate', 'branch_count', 'operating_hours',
        'social_profiles',
        'lead_score', 'estimated_closing_amount', 'realized_closing_amount',
        'qualification_status', 'ai_explanation', 'customer_story', 'meeting_link',
        'duplicate_status', 'duplicate_of_id', 'external_place_id',
        'use_ai_reference', 'ai_mode', 'ai_reference_source_type',
        'ai_reference_id', 'ai_processing_status',
        'funnel_stage_id', 'owner_id',
        'presales_owner_id', 'am_owner_id', 'csm_owner_id',
        'territory_id', 'product_id', 'created_by',
        'tenant_id', 'parent_lead_id', 'external_id',
        'lark_base_id', 'lark_table_id',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'social_profiles' => 'array',
        'lead_score' => 'integer',
        'estimated_closing_amount' => 'decimal:2',
        'realized_closing_amount' => 'decimal:2',
        'use_ai_reference' => 'boolean',
        'branch_count' => 'integer',
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

    public function businessCategory(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class);
    }

    public function funnelStage(): BelongsTo
    {
        return $this->belongsTo(FunnelStage::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function presalesOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presales_owner_id');
    }

    public function amOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'am_owner_id');
    }

    public function csmOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'csm_owner_id');
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

    public function contactEnrichmentCandidates(): HasMany
    {
        return $this->hasMany(ContactEnrichmentCandidate::class);
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

    public function parentLead(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_lead_id');
    }

    public function subsidiaries(): HasMany
    {
        return $this->hasMany(self::class, 'parent_lead_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /* ── Intelligence & Activity Engine ── */

    public function scores(): HasMany
    {
        return $this->hasMany(LeadScore::class);
    }

    public function scoreBreakdowns(): HasMany
    {
        return $this->hasMany(LeadScoreBreakdown::class);
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

    public function analysisLogs(): HasMany
    {
        return $this->hasMany(LeadAnalysisLog::class);
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
        return $this->hasMany(LeadAiEvaluation::class)->orderBy('evaluated_at', 'desc');
    }

    public function preMeetingBriefs(): HasMany
    {
        return $this->hasMany(LeadPreMeetingBrief::class)->orderBy('created_at', 'desc');
    }

    public function preMeetingBrief(): HasOne
    {
        return $this->hasOne(LeadPreMeetingBrief::class)->latestOfMany();
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(LeadFollowUp::class);
    }

    public function salesVisits(): HasMany
    {
        return $this->hasMany(SalesVisit::class);
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

    public function bantcQuestionGuide(): HasOne
    {
        return $this->hasOne(LeadBantcQuestionGuide::class);
    }

    public function qualificationWorkflowReviews(): HasMany
    {
        return $this->hasMany(QualificationWorkflowReview::class);
    }

    public function larkBaseRecordMappings(): HasMany
    {
        return $this->hasMany(LarkBaseRecordMapping::class, 'leadsy_entity_id')
            ->where('leadsy_entity_type', 'lead');
    }

    public function scopeVisibleTo(Builder $query, ?User $user): Builder
    {
        if (! $user || $user->isSuperAdmin() || $user->isExecutive()) {
            return $query;
        }

        $visibleUserIds = $user->hierarchyUserIds();

        return $query->where(function (Builder $visibility) use ($visibleUserIds) {
            $visibility
                ->whereIn('owner_id', $visibleUserIds)
                ->orWhereIn('presales_owner_id', $visibleUserIds)
                ->orWhereIn('am_owner_id', $visibleUserIds)
                ->orWhereIn('csm_owner_id', $visibleUserIds)
                ->orWhereIn('created_by', $visibleUserIds);
        });
    }
}
