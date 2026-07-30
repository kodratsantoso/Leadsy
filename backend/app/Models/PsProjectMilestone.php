<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsProjectMilestone extends Model
{
    use HasFactory;

    protected $table = 'ps_project_milestones';

    protected $fillable = [
        'project_plan_id',
        'milestone_name',
        'description',
        'planned_date',
        'owner_id',
        'status',
        'dependency_notes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'planned_date' => 'date',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
}
