<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property int|null $source_estimation_task_id
 * @property int|null $parent_task_id
 * @property string $task_type
 * @property string $task_name
 * @property string|null $description
 * @property string|null $deliverable
 * @property array<array-key, mixed>|null $acceptance_criteria
 * @property int|null $assigned_role_id
 * @property int|null $assigned_user_id
 * @property numeric $estimated_mandays
 * @property \Illuminate\Support\Carbon|null $planned_start_date
 * @property \Illuminate\Support\Carbon|null $planned_end_date
 * @property int|null $duration_days
 * @property array<array-key, mixed>|null $dependency_notes
 * @property int|null $predecessor_task_id
 * @property string $status
 * @property string $priority
 * @property array<array-key, mixed>|null $risk_notes
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int $progress_percentage
 * @property \Illuminate\Support\Carbon|null $actual_start_date
 * @property \Illuminate\Support\Carbon|null $actual_end_date
 * @property string|null $completion_notes
 * @property string|null $blocker_reason
 * @property int|null $completed_by
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property-read \App\Models\PsRole|null $assignedRole
 * @property-read \App\Models\User|null $assignedUser
 * @property-read \App\Models\User|null $completedBy
 * @property-read PsProjectTask|null $parentTask
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\PsEstimationLine|null $sourceEstimationTask
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PsProjectTask> $subtasks
 * @property-read int|null $subtasks_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsWorkLog> $workLogs
 * @property-read int|null $work_logs_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereAcceptanceCriteria($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereActualEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereActualStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereAssignedRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereAssignedUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereBlockerReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereCompletedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereCompletionNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereDeliverable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereDependencyNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereDurationDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereEstimatedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereParentTaskId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask wherePlannedEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask wherePlannedStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask wherePredecessorTaskId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereProgressPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereRiskNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereSourceEstimationTaskId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereTaskName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereTaskType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectTask whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsProjectTask extends Model
{
    use HasFactory;

    protected $table = 'ps_project_tasks';

    protected $fillable = [
        'project_plan_id',
        'source_estimation_task_id',
        'parent_task_id',
        'task_type',
        'task_name',
        'description',
        'deliverable',
        'acceptance_criteria',
        'assigned_role_id',
        'assigned_user_id',
        'estimated_mandays',
        'planned_start_date',
        'planned_end_date',
        'duration_days',
        'dependency_notes',
        'predecessor_task_id',
        'status',
        'priority',
        'risk_notes',
        'sort_order',
        'progress_percentage',
        'actual_start_date',
        'actual_end_date',
        'completion_notes',
        'blocker_reason',
        'completed_by',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'acceptance_criteria' => 'array',
            'dependency_notes' => 'array',
            'risk_notes' => 'array',
            'estimated_mandays' => 'decimal:2',
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'actual_start_date' => 'date',
            'actual_end_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function sourceEstimationTask(): BelongsTo { return $this->belongsTo(PsEstimationLine::class, 'source_estimation_task_id'); }
    public function parentTask(): BelongsTo { return $this->belongsTo(PsProjectTask::class, 'parent_task_id'); }
    public function subtasks(): HasMany { return $this->hasMany(PsProjectTask::class, 'parent_task_id')->orderBy('sort_order'); }
    public function assignedRole(): BelongsTo { return $this->belongsTo(PsRole::class, 'assigned_role_id'); }
    public function assignedUser(): BelongsTo { return $this->belongsTo(User::class, 'assigned_user_id'); }
    
    public function workLogs(): HasMany { return $this->hasMany(PsWorkLog::class, 'project_task_id'); }
    public function completedBy(): BelongsTo { return $this->belongsTo(User::class, 'completed_by'); }
}
