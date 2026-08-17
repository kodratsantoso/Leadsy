<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $change_request_number
 * @property int $project_plan_id
 * @property int|null $estimation_id
 * @property int|null $lead_id
 * @property int|null $quotation_id
 * @property int|null $sales_order_id
 * @property string $title
 * @property string $description
 * @property string|null $reason
 * @property string $impact_type
 * @property numeric $additional_mandays
 * @property numeric $additional_fee
 * @property int $timeline_impact_days
 * @property array<array-key, mixed>|null $affected_tasks_json
 * @property string $status
 * @property int|null $requested_by
 * @property int|null $approved_by
 * @property string|null $approved_at
 * @property string|null $rejection_reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $approvedBy
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\User|null $requestedBy
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereAdditionalFee($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereAdditionalMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereAffectedTasksJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereApprovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereChangeRequestNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereImpactType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereRejectionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereRequestedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereSalesOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereTimelineImpactDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsChangeRequest whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsChangeRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'change_request_number',
        'project_plan_id',
        'estimation_id',
        'lead_id',
        'quotation_id',
        'sales_order_id',
        'title',
        'description',
        'reason',
        'impact_type',
        'additional_mandays',
        'additional_fee',
        'timeline_impact_days',
        'affected_tasks_json',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'affected_tasks_json' => 'array',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
