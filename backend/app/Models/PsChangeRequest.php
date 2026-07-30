<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
