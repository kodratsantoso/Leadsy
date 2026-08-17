<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $estimation_number
 * @property int|null $lead_id
 * @property int|null $service_category_id
 * @property int|null $template_id
 * @property int|null $complexity_level_id
 * @property string $title
 * @property numeric $complexity_multiplier
 * @property numeric $buffer_percentage
 * @property string $currency_code
 * @property numeric $total_base_mandays
 * @property numeric $total_adjusted_mandays
 * @property numeric $total_buffer_mandays
 * @property numeric $total_manual_adjustment_mandays
 * @property numeric $total_final_mandays
 * @property numeric $total_estimated_fee
 * @property string|null $assumptions
 * @property string|null $out_of_scope
 * @property string|null $dependencies
 * @property string|null $risks
 * @property string|null $internal_notes
 * @property string $status
 * @property int|null $created_by
 * @property int|null $reviewed_by
 * @property int|null $approved_by
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $converted_quotation_id
 * @property \Illuminate\Support\Carbon|null $converted_at
 * @property int|null $converted_by
 * @property int $version_number
 * @property int|null $parent_estimation_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsApprovalLog> $approvalLogs
 * @property-read int|null $approval_logs_count
 * @property-read \App\Models\User|null $approver
 * @property-read \App\Models\PsServiceCategory|null $category
 * @property-read \App\Models\PsComplexityLevel|null $complexityLevel
 * @property-read \App\Models\LeadQuotation|null $convertedQuotation
 * @property-read \App\Models\User|null $converter
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsEstimationLine> $lines
 * @property-read int|null $lines_count
 * @property-read PsEstimation|null $parentEstimation
 * @property-read \App\Models\PsProjectPlan|null $projectPlan
 * @property-read \App\Models\User|null $reviewer
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsRevision> $revisionsAsOriginal
 * @property-read int|null $revisions_as_original_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsRevision> $revisionsAsRevised
 * @property-read int|null $revisions_as_revised_count
 * @property-read \App\Models\PsEstimationTemplate|null $template
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsEstimationVersion> $versions
 * @property-read int|null $versions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereApprovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereAssumptions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereBufferPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereComplexityLevelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereComplexityMultiplier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereConvertedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereConvertedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereConvertedQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereCurrencyCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereDependencies($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereEstimationNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereInternalNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereOutOfScope($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereParentEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereRisks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereServiceCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalAdjustedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalBaseMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalBufferMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalEstimatedFee($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalFinalMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereTotalManualAdjustmentMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimation whereVersionNumber($value)
 * @mixin \Eloquent
 */
class PsEstimation extends Model
{
    use HasFactory;

    protected $table = 'ps_estimations';

    protected $fillable = [
        'estimation_number',
        'version_number',
        'parent_estimation_id',
        'lead_id',
        'service_category_id',
        'template_id',
        'complexity_level_id',
        'title',
        'complexity_multiplier',
        'buffer_percentage',
        'currency_code',
        'total_base_mandays',
        'total_adjusted_mandays',
        'total_buffer_mandays',
        'total_manual_adjustment_mandays',
        'total_final_mandays',
        'total_estimated_fee',
        'assumptions',
        'out_of_scope',
        'dependencies',
        'risks',
        'internal_notes',
        'status',
        'created_by',
        'reviewed_by',
        'approved_by',
        'reviewed_at',
        'approved_at',
        'converted_quotation_id',
        'converted_at',
        'converted_by',
    ];

    protected function casts(): array
    {
        return [
            'complexity_multiplier' => 'decimal:2',
            'buffer_percentage' => 'decimal:2',
            'total_base_mandays' => 'decimal:2',
            'total_adjusted_mandays' => 'decimal:2',
            'total_buffer_mandays' => 'decimal:2',
            'total_manual_adjustment_mandays' => 'decimal:2',
            'total_final_mandays' => 'decimal:2',
            'total_estimated_fee' => 'decimal:2',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PsServiceCategory::class, 'service_category_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PsEstimationTemplate::class, 'template_id');
    }

    public function complexityLevel(): BelongsTo
    {
        return $this->belongsTo(PsComplexityLevel::class, 'complexity_level_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PsEstimationLine::class, 'estimation_id')->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function convertedQuotation(): BelongsTo
    {
        return $this->belongsTo(LeadQuotation::class, 'converted_quotation_id');
    }

    public function converter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'converted_by');
    }

    public function parentEstimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class, 'parent_estimation_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PsEstimationVersion::class, 'estimation_id');
    }

    public function approvalLogs(): HasMany
    {
        return $this->hasMany(PsApprovalLog::class, 'estimation_id');
    }

    public function revisionsAsOriginal(): HasMany
    {
        return $this->hasMany(PsRevision::class, 'original_estimation_id');
    }

    public function revisionsAsRevised(): HasMany
    {
        return $this->hasMany(PsRevision::class, 'revised_estimation_id');
    }

    public function projectPlan(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(PsProjectPlan::class, 'estimation_id');
    }
}
