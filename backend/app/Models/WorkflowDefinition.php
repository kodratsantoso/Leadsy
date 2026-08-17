<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $name
 * @property string $base_record_type
 * @property string $category
 * @property string $status
 * @property string|null $description
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\User|null $updater
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowVersion> $versions
 * @property-read int|null $versions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereBaseRecordType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowDefinition withoutTrashed()
 * @mixin \Eloquent
 */
class WorkflowDefinition extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'base_record_type', 'category', 'status',
        'description', 'created_by', 'updated_by'
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(WorkflowVersion::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
