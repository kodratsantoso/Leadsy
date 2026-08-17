<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property string $item_name
 * @property bool $is_required
 * @property bool $is_completed
 * @property string|null $override_reason
 * @property int|null $overridden_by
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $overrider
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereIsCompleted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereIsRequired($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereItemName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereOverriddenBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereOverrideReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectReadinessItem whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsProjectReadinessItem extends Model
{
    use HasFactory;

    protected $table = 'ps_project_readiness_items';

    protected $fillable = [
        'project_plan_id',
        'item_name',
        'is_required',
        'is_completed',
        'override_reason',
        'overridden_by',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_completed' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function overrider(): BelongsTo { return $this->belongsTo(User::class, 'overridden_by'); }
}
