<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $company_name
 * @property string|null $address
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $website
 * @property string|null $website_domain
 * @property string|null $phone
 * @property string|null $email
 * @property int|null $industry_id
 * @property int|null $sub_industry_id
 * @property string|null $business_category
 * @property string|null $company_size_estimate
 * @property int|null $branch_count
 * @property string|null $operating_hours
 * @property array<array-key, mixed>|null $social_profiles
 * @property int|null $lead_score
 * @property string $qualification_status
 * @property string|null $ai_explanation
 * @property string $duplicate_status
 * @property int|null $duplicate_of_id
 * @property string|null $external_place_id
 * @property bool $use_ai_reference
 * @property string $ai_mode
 * @property string|null $ai_reference_source_type
 * @property int|null $ai_reference_id
 * @property string|null $ai_processing_status
 * @property int|null $funnel_stage_id
 * @property int|null $owner_id
 * @property int|null $territory_id
 * @property int|null $product_id
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $tenant_id
 * @property numeric|null $estimated_closing_amount
 * @property numeric|null $realized_closing_amount
 * @property int|null $parent_lead_id
 * @property int|null $presales_owner_id
 * @property int|null $am_owner_id
 * @property int|null $csm_owner_id
 * @property string|null $customer_story
 * @property string|null $external_id
 * @property string|null $lark_base_id Source Base ID from Lark
 * @property string|null $lark_table_id Source Table ID from Lark
 * @property string|null $meeting_link
 * @property int|null $business_category_id
 * @property string|null $budget
 * @property string|null $authority
 * @property string|null $needs
 * @property string|null $timeline
 * @property string|null $competitor
 * @property string $enrichment_status
 * @property \Illuminate\Support\Carbon|null $last_enriched_at
 * @property array<array-key, mixed>|null $enrichment_metadata
 * @property string|null $brand
 * @property array<array-key, mixed>|null $general_meeting_summary
 * @property int|null $general_meeting_attachment_id
 * @property array<array-key, mixed>|null $discovery_meeting_summary
 * @property int|null $discovery_meeting_attachment_id
 * @property array<array-key, mixed>|null $demo_meeting_summary
 * @property int|null $demo_meeting_attachment_id
 * @property array<array-key, mixed>|null $follow_up_meeting_summary
 * @property int|null $follow_up_meeting_attachment_id
 * @property array<array-key, mixed>|null $proposal_discussion_summary
 * @property int|null $proposal_discussion_attachment_id
 * @property array<array-key, mixed>|null $closing_discussion_summary
 * @property int|null $closing_discussion_attachment_id
 * @property array<array-key, mixed>|null $handover_to_csm_summary
 * @property int|null $handover_to_csm_attachment_id
 * @property string|null $lark_folder_token
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadActivity> $activities
 * @property-read int|null $activities_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadAiAnalysis> $aiAnalyses
 * @property-read int|null $ai_analyses_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadAiEvaluation> $aiEvaluations
 * @property-read int|null $ai_evaluations_count
 * @property-read \App\Models\User|null $amOwner
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadAnalysisLog> $analysisLogs
 * @property-read int|null $analysis_logs_count
 * @property-read \App\Models\LeadBantcQuestionGuide|null $bantcQuestionGuide
 * @property-read \App\Models\BusinessCategory|null $businessCategory
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadCommissionAllocation> $commissionAllocations
 * @property-read int|null $commission_allocations_count
 * @property-read \App\Models\ConfidentialityAssessment|null $confidentialityAssessment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ContactEnrichmentCandidate> $contactEnrichmentCandidates
 * @property-read int|null $contact_enrichment_candidates_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadContact> $contacts
 * @property-read int|null $contacts_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadConversionPrediction> $conversionPredictions
 * @property-read int|null $conversion_predictions_count
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $csmOwner
 * @property-read Lead|null $duplicateOf
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadFollowUp> $followUps
 * @property-read int|null $follow_ups_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadFunnelHistory> $funnelHistory
 * @property-read int|null $funnel_history_count
 * @property-read \App\Models\FunnelStage|null $funnelStage
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadIcpMatch> $icpMatches
 * @property-read int|null $icp_matches_count
 * @property-read \App\Models\Industry|null $industry
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkBaseRecordMapping> $larkBaseRecordMappings
 * @property-read int|null $lark_base_record_mappings_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadMeeting> $meetings
 * @property-read int|null $meetings_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadOutcome> $outcomes
 * @property-read int|null $outcomes_count
 * @property-read \App\Models\User|null $owner
 * @property-read Lead|null $parentLead
 * @property-read \App\Models\LeadPreMeetingBrief|null $preMeetingBrief
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadPreMeetingBrief> $preMeetingBriefs
 * @property-read int|null $pre_meeting_briefs_count
 * @property-read \App\Models\User|null $presalesOwner
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadPrescription> $prescriptions
 * @property-read int|null $prescriptions_count
 * @property-read \App\Models\Product|null $product
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadProductMatch> $productMatches
 * @property-read int|null $product_matches_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsEstimation> $professionalServiceEstimations
 * @property-read int|null $professional_service_estimations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationWorkflowReview> $qualificationWorkflowReviews
 * @property-read int|null $qualification_workflow_reviews_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadQualification> $qualifications
 * @property-read int|null $qualifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadQuotation> $quotations
 * @property-read int|null $quotations_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadRevenueAnalysis> $revenueAnalyses
 * @property-read int|null $revenue_analyses_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadRoleAssignment> $roleAssignments
 * @property-read int|null $role_assignments_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadSalesOrder> $salesOrders
 * @property-read int|null $sales_orders_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SalesVisit> $salesVisits
 * @property-read int|null $sales_visits_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadScoreBreakdown> $scoreBreakdowns
 * @property-read int|null $score_breakdowns_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadScore> $scores
 * @property-read int|null $scores_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadSource> $sources
 * @property-read int|null $sources_count
 * @property-read \App\Models\SubIndustry|null $subIndustry
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Lead> $subsidiaries
 * @property-read int|null $subsidiaries_count
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\Territory|null $territory
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadTranscript> $transcripts
 * @property-read int|null $transcripts_count
 * @method static Builder<static>|Lead newModelQuery()
 * @method static Builder<static>|Lead newQuery()
 * @method static Builder<static>|Lead onlyTrashed()
 * @method static Builder<static>|Lead query()
 * @method static Builder<static>|Lead visibleTo(?\App\Models\User $user)
 * @method static Builder<static>|Lead whereAddress($value)
 * @method static Builder<static>|Lead whereAiExplanation($value)
 * @method static Builder<static>|Lead whereAiMode($value)
 * @method static Builder<static>|Lead whereAiProcessingStatus($value)
 * @method static Builder<static>|Lead whereAiReferenceId($value)
 * @method static Builder<static>|Lead whereAiReferenceSourceType($value)
 * @method static Builder<static>|Lead whereAmOwnerId($value)
 * @method static Builder<static>|Lead whereAuthority($value)
 * @method static Builder<static>|Lead whereBranchCount($value)
 * @method static Builder<static>|Lead whereBrand($value)
 * @method static Builder<static>|Lead whereBudget($value)
 * @method static Builder<static>|Lead whereBusinessCategory($value)
 * @method static Builder<static>|Lead whereBusinessCategoryId($value)
 * @method static Builder<static>|Lead whereClosingDiscussionAttachmentId($value)
 * @method static Builder<static>|Lead whereClosingDiscussionSummary($value)
 * @method static Builder<static>|Lead whereCompanyName($value)
 * @method static Builder<static>|Lead whereCompanySizeEstimate($value)
 * @method static Builder<static>|Lead whereCompetitor($value)
 * @method static Builder<static>|Lead whereCreatedAt($value)
 * @method static Builder<static>|Lead whereCreatedBy($value)
 * @method static Builder<static>|Lead whereCsmOwnerId($value)
 * @method static Builder<static>|Lead whereCustomerStory($value)
 * @method static Builder<static>|Lead whereDeletedAt($value)
 * @method static Builder<static>|Lead whereDemoMeetingAttachmentId($value)
 * @method static Builder<static>|Lead whereDemoMeetingSummary($value)
 * @method static Builder<static>|Lead whereDiscoveryMeetingAttachmentId($value)
 * @method static Builder<static>|Lead whereDiscoveryMeetingSummary($value)
 * @method static Builder<static>|Lead whereDuplicateOfId($value)
 * @method static Builder<static>|Lead whereDuplicateStatus($value)
 * @method static Builder<static>|Lead whereEmail($value)
 * @method static Builder<static>|Lead whereEnrichmentMetadata($value)
 * @method static Builder<static>|Lead whereEnrichmentStatus($value)
 * @method static Builder<static>|Lead whereEstimatedClosingAmount($value)
 * @method static Builder<static>|Lead whereExternalId($value)
 * @method static Builder<static>|Lead whereExternalPlaceId($value)
 * @method static Builder<static>|Lead whereFollowUpMeetingAttachmentId($value)
 * @method static Builder<static>|Lead whereFollowUpMeetingSummary($value)
 * @method static Builder<static>|Lead whereFunnelStageId($value)
 * @method static Builder<static>|Lead whereGeneralMeetingAttachmentId($value)
 * @method static Builder<static>|Lead whereGeneralMeetingSummary($value)
 * @method static Builder<static>|Lead whereHandoverToCsmAttachmentId($value)
 * @method static Builder<static>|Lead whereHandoverToCsmSummary($value)
 * @method static Builder<static>|Lead whereId($value)
 * @method static Builder<static>|Lead whereIndustryId($value)
 * @method static Builder<static>|Lead whereLarkBaseId($value)
 * @method static Builder<static>|Lead whereLarkFolderToken($value)
 * @method static Builder<static>|Lead whereLarkTableId($value)
 * @method static Builder<static>|Lead whereLastEnrichedAt($value)
 * @method static Builder<static>|Lead whereLat($value)
 * @method static Builder<static>|Lead whereLeadScore($value)
 * @method static Builder<static>|Lead whereLng($value)
 * @method static Builder<static>|Lead whereMeetingLink($value)
 * @method static Builder<static>|Lead whereNeeds($value)
 * @method static Builder<static>|Lead whereOperatingHours($value)
 * @method static Builder<static>|Lead whereOwnerId($value)
 * @method static Builder<static>|Lead whereParentLeadId($value)
 * @method static Builder<static>|Lead wherePhone($value)
 * @method static Builder<static>|Lead wherePresalesOwnerId($value)
 * @method static Builder<static>|Lead whereProductId($value)
 * @method static Builder<static>|Lead whereProposalDiscussionAttachmentId($value)
 * @method static Builder<static>|Lead whereProposalDiscussionSummary($value)
 * @method static Builder<static>|Lead whereQualificationStatus($value)
 * @method static Builder<static>|Lead whereRealizedClosingAmount($value)
 * @method static Builder<static>|Lead whereSocialProfiles($value)
 * @method static Builder<static>|Lead whereSubIndustryId($value)
 * @method static Builder<static>|Lead whereTenantId($value)
 * @method static Builder<static>|Lead whereTerritoryId($value)
 * @method static Builder<static>|Lead whereTimeline($value)
 * @method static Builder<static>|Lead whereUpdatedAt($value)
 * @method static Builder<static>|Lead whereUseAiReference($value)
 * @method static Builder<static>|Lead whereWebsite($value)
 * @method static Builder<static>|Lead whereWebsiteDomain($value)
 * @method static Builder<static>|Lead withTrashed(bool $withTrashed = true)
 * @method static Builder<static>|Lead withoutTrashed()
 * @mixin \Eloquent
 */
class Lead extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_name', 'brand', 'address', 'lat', 'lng',
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
        'budget', 'authority', 'needs', 'timeline', 'competitor',
        'enrichment_status', 'last_enriched_at', 'enrichment_metadata',
        'general_meeting_summary', 'general_meeting_attachment_id',
        'discovery_meeting_summary', 'discovery_meeting_attachment_id',
        'demo_meeting_summary', 'demo_meeting_attachment_id',
        'follow_up_meeting_summary', 'follow_up_meeting_attachment_id',
        'proposal_discussion_summary', 'proposal_discussion_attachment_id',
        'closing_discussion_summary', 'closing_discussion_attachment_id',
        'handover_to_csm_summary', 'handover_to_csm_attachment_id',
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
        'last_enriched_at' => 'datetime',
        'enrichment_metadata' => 'array',
        'general_meeting_summary' => 'array',
        'discovery_meeting_summary' => 'array',
        'demo_meeting_summary' => 'array',
        'follow_up_meeting_summary' => 'array',
        'proposal_discussion_summary' => 'array',
        'closing_discussion_summary' => 'array',
        'handover_to_csm_summary' => 'array',
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

    public function professionalServiceEstimations(): HasMany
    {
        return $this->hasMany(PsEstimation::class);
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

    public function roleAssignments(): HasMany
    {
        return $this->hasMany(LeadRoleAssignment::class);
    }

    public function confidentialityAssessment(): MorphOne
    {
        return $this->morphOne(ConfidentialityAssessment::class, 'entity');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(LeadQuotation::class);
    }

    public function salesOrders(): HasMany
    {
        return $this->hasMany(LeadSalesOrder::class);
    }

    public function commissionAllocations(): HasMany
    {
        return $this->hasMany(LeadCommissionAllocation::class);
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
                ->orWhereIn('created_by', $visibleUserIds)
                ->orWhereHas('roleAssignments', function (Builder $rq) use ($visibleUserIds) {
                    $rq->whereIn('user_id', $visibleUserIds)
                       ->where('assignment_status', 'active');
                });
        });
    }
}
