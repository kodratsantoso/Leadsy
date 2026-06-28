<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
