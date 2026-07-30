<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
