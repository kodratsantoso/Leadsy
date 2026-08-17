<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $target_name
 * @property string $role_type
 * @property int|null $assigned_user_id
 * @property int|null $direct_manager_id
 * @property string $kpi_type
 * @property string $period_type
 * @property string $start_date
 * @property string $end_date
 * @property string $target_value_type
 * @property int|null $target_quantity
 * @property numeric|null $target_percentage
 * @property numeric|null $target_score
 * @property int|null $target_days
 * @property numeric|null $target_hours
 * @property numeric|null $actual_value
 * @property numeric|null $achievement_percentage
 * @property int|null $product_id
 * @property int|null $industry_id
 * @property int|null $business_category_id
 * @property numeric $weight
 * @property string $status
 * @property string|null $notes
 * @property int|null $created_by
 * @property int $tenant_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignedUser
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $directManager
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereAchievementPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereActualValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereAssignedUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereBusinessCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereDirectManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereIndustryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereKpiType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget wherePeriodType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereRoleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetHours($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTargetValueType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiTarget whereWeight($value)
 * @mixin \Eloquent
 */
class KpiTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'target_name',
        'role_type',
        'assigned_user_id',
        'assigned_team_id',
        'direct_manager_id',
        'kpi_type',
        'period_type',
        'start_date',
        'end_date',
        'target_value_type',
        'target_quantity',
        'target_percentage',
        'target_score',
        'target_days',
        'target_hours',
        'actual_value',
        'achievement_percentage',
        'product_id',
        'industry_id',
        'business_category_id',
        'weight',
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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
