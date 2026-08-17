<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property string $milestone_name
 * @property string|null $description
 * @property \Illuminate\Support\Carbon|null $planned_date
 * @property int|null $owner_id
 * @property string $status
 * @property string|null $dependency_notes
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $owner
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereDependencyNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereMilestoneName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone wherePlannedDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectMilestone whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
