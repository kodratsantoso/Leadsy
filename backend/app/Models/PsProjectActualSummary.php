<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
