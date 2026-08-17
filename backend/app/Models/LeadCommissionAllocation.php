<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $order_id
 * @property int $user_id
 * @property string $role_type
 * @property numeric $contribution_percentage
 * @property numeric $revenue_basis
 * @property numeric|null $commission_rate
 * @property numeric|null $calculated_commission_amount
 * @property string $commission_status
 * @property array<array-key, mixed>|null $calculation_snapshot_json
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\LeadSalesOrder|null $order
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereCalculatedCommissionAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereCalculationSnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereCommissionRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereCommissionStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereContributionPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereRevenueBasis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereRoleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadCommissionAllocation whereUserId($value)
 * @mixin \Eloquent
 */
class LeadCommissionAllocation extends Model
{
    protected $fillable = [
        'lead_id', 'order_id', 'user_id', 'role_type',
        'contribution_percentage', 'revenue_basis', 'commission_rate',
        'calculated_commission_amount', 'commission_status',
        'calculation_snapshot_json'
    ];

    protected $casts = [
        'contribution_percentage' => 'decimal:2',
        'revenue_basis' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'calculated_commission_amount' => 'decimal:2',
        'calculation_snapshot_json' => 'array',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function order()
    {
        return $this->belongsTo(LeadSalesOrder::class, 'order_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
