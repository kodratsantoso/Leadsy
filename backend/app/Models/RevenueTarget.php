<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $target_name
 * @property string $owner_type
 * @property string|null $role_type
 * @property int|null $assigned_user_id
 * @property int|null $direct_manager_id
 * @property string $revenue_target_type
 * @property string $period_type
 * @property int $year
 * @property int|null $quarter
 * @property int|null $month
 * @property string $currency_code
 * @property string $currency_symbol
 * @property numeric $target_amount
 * @property numeric|null $actual_amount
 * @property numeric|null $achievement_percentage
 * @property string|null $allocation_method
 * @property int|null $parent_target_id
 * @property numeric|null $allocated_amount
 * @property numeric|null $allocation_percentage
 * @property numeric|null $remaining_amount_snapshot
 * @property int|null $product_id
 * @property int|null $industry_id
 * @property int|null $business_category_id
 * @property string $status
 * @property string|null $notes
 * @property int|null $created_by
 * @property int $tenant_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignedUser
 * @property-read \Illuminate\Database\Eloquent\Collection<int, RevenueTarget> $childrenTargets
 * @property-read int|null $children_targets_count
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $directManager
 * @property-read RevenueTarget|null $parentTarget
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereAchievementPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereActualAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereAllocatedAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereAllocationMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereAllocationPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereAssignedUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereBusinessCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereCurrencyCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereCurrencySymbol($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereDirectManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereIndustryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereMonth($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereOwnerType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereParentTargetId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget wherePeriodType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereQuarter($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereRemainingAmountSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereRevenueTargetType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereRoleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereTargetAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereTargetName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueTarget whereYear($value)
 * @mixin \Eloquent
 */
class RevenueTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'target_name',
        'owner_type',
        'role_type',
        'assigned_user_id',
        'assigned_team_id',
        'direct_manager_id',
        'revenue_target_type',
        'period_type',
        'year',
        'quarter',
        'month',
        'currency_code',
        'currency_symbol',
        'target_amount',
        'actual_amount',
        'achievement_percentage',
        'allocation_method',
        'parent_target_id',
        'allocated_amount',
        'allocation_percentage',
        'remaining_amount_snapshot',
        'product_id',
        'industry_id',
        'business_category_id',
        'status',
        'notes',
        'created_by',
        'tenant_id',
    ];

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function directManager()
    {
        return $this->belongsTo(User::class, 'direct_manager_id');
    }

    public function parentTarget()
    {
        return $this->belongsTo(RevenueTarget::class, 'parent_target_id');
    }

    public function childrenTargets()
    {
        return $this->hasMany(RevenueTarget::class, 'parent_target_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
