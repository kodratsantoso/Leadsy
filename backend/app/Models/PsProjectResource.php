<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property int $role_id
 * @property int|null $assigned_user_id
 * @property numeric $estimated_mandays
 * @property \Illuminate\Support\Carbon|null $planned_start_date
 * @property \Illuminate\Support\Carbon|null $planned_end_date
 * @property int|null $allocation_percentage
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignedUser
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\PsRole $role
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereAllocationPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereAssignedUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereEstimatedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource wherePlannedEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource wherePlannedStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectResource whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsProjectResource extends Model
{
    use HasFactory;

    protected $table = 'ps_project_resources';

    protected $fillable = [
        'project_plan_id',
        'role_id',
        'assigned_user_id',
        'estimated_mandays',
        'planned_start_date',
        'planned_end_date',
        'allocation_percentage',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_mandays' => 'decimal:2',
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'allocation_percentage' => 'integer',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function role(): BelongsTo { return $this->belongsTo(PsRole::class, 'role_id'); }
    public function assignedUser(): BelongsTo { return $this->belongsTo(User::class, 'assigned_user_id'); }
}
