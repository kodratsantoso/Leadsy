<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $trigger_status
 * @property bool $requires_approval
 * @property bool $override_enabled
 * @property int|null $sla_hours
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $tenant_id
 * @property-read \App\Models\User|null $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationWorkflowReview> $reviews
 * @property-read int|null $reviews_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationWorkflowStage> $stages
 * @property-read int|null $stages_count
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereOverrideEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereRequiresApproval($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereSlaHours($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereTriggerStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflow withoutTrashed()
 * @mixin \Eloquent
 */
class QualificationWorkflow extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'slug', 'trigger_status', 'requires_approval',
        'override_enabled', 'sla_hours', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'override_enabled' => 'boolean',
        'sla_hours' => 'integer',
        'is_active' => 'boolean',
    ];

    public function stages(): HasMany
    {
        return $this->hasMany(QualificationWorkflowStage::class, 'workflow_id')->orderBy('sequence');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(QualificationWorkflowReview::class, 'workflow_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
