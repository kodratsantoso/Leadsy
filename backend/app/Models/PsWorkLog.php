<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property int|null $project_task_id
 * @property int $user_id
 * @property int|null $role_id
 * @property string $work_date
 * @property numeric $actual_mandays
 * @property numeric|null $work_hours
 * @property string|null $work_description
 * @property string $work_type
 * @property bool $billable
 * @property string $approval_status
 * @property string|null $submitted_at
 * @property int|null $approved_by
 * @property string|null $approved_at
 * @property string|null $rejection_reason
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $approvedBy
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\PsProjectTask|null $projectTask
 * @property-read \App\Models\PsRole|null $role
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereActualMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereApprovalStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereApprovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereApprovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereBillable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereProjectTaskId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereRejectionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereSubmittedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereWorkDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereWorkDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereWorkHours($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsWorkLog whereWorkType($value)
 * @mixin \Eloquent
 */
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
