<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property numeric $estimated_mandays
 * @property numeric $planned_mandays
 * @property numeric $submitted_actual_mandays
 * @property numeric $approved_actual_mandays
 * @property numeric $remaining_mandays
 * @property numeric $variance_mandays
 * @property numeric $variance_percentage
 * @property numeric $burn_rate
 * @property string $overrun_status
 * @property numeric $revenue_amount
 * @property numeric $estimated_cost
 * @property numeric $actual_cost
 * @property numeric $estimated_margin_amount
 * @property numeric $estimated_margin_percentage
 * @property numeric $actual_margin_amount
 * @property numeric $actual_margin_percentage
 * @property numeric $margin_variance
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereActualCost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereActualMarginAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereActualMarginPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereApprovedActualMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereBurnRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereEstimatedCost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereEstimatedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereEstimatedMarginAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereEstimatedMarginPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereMarginVariance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereOverrunStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary wherePlannedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereRemainingMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereRevenueAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereSubmittedActualMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereVarianceMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectActualSummary whereVariancePercentage($value)
 * @mixin \Eloquent
 */
class PsProjectActualSummary extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_plan_id',
        'estimated_mandays',
        'planned_mandays',
        'submitted_actual_mandays',
        'approved_actual_mandays',
        'remaining_mandays',
        'variance_mandays',
        'variance_percentage',
        'burn_rate',
        'overrun_status',
        'revenue_amount',
        'estimated_cost',
        'actual_cost',
        'estimated_margin_amount',
        'estimated_margin_percentage',
        'actual_margin_amount',
        'actual_margin_percentage',
        'margin_variance',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }
}
