<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property string $risk_title
 * @property string|null $risk_description
 * @property string $risk_level
 * @property string|null $mitigation_plan
 * @property int|null $owner_id
 * @property string $status
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $probability
 * @property int|null $impact
 * @property \Illuminate\Support\Carbon|null $due_date
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $owner
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereDueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereImpact($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereMitigationPlan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereProbability($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereRiskDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereRiskLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereRiskTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectRisk whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsProjectRisk extends Model
{
    use HasFactory;

    protected $table = 'ps_project_risks';

    protected $fillable = [
        'project_plan_id',
        'risk_title',
        'risk_description',
        'risk_level',
        'mitigation_plan',
        'owner_id',
        'status',
        'created_by',
        'sort_order',
        'probability',
        'impact',
        'due_date',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
