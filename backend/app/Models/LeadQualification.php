<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $qualified
 * @property string|null $business_type
 * @property string|null $company_size_band
 * @property string|null $qualification_reason
 * @property \Illuminate\Support\Carbon $last_qualified_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $classification
 * @property int|null $score
 * @property array<array-key, mixed>|null $dimension_breakdown
 * @property array<array-key, mixed>|null $risk_flags
 * @property array<array-key, mixed>|null $hard_stops
 * @property string|null $recommendation
 * @property array<array-key, mixed>|null $evaluation_snapshot
 * @property int|null $tenant_id
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationWorkflowReview> $workflowReviews
 * @property-read int|null $workflow_reviews_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereBusinessType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereClassification($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereCompanySizeBand($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereDimensionBreakdown($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereEvaluationSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereHardStops($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereLastQualifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereQualificationReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereQualified($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereRecommendation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereRiskFlags($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQualification whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
