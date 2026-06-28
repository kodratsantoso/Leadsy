<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
