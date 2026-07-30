<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PsWorkLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_plan_id',
        'project_task_id',
        'user_id',
        'role_id',
        'work_date',
        'actual_mandays',
        'work_hours',
        'work_description',
        'work_type',
        'billable',
        'approval_status',
        'submitted_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }

    public function projectTask()
    {
        return $this->belongsTo(PsProjectTask::class, 'project_task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function role()
    {
        return $this->belongsTo(PsRole::class, 'role_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
