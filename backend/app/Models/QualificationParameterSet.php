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
 * @property string $version
 * @property string $status
 * @property string|null $description
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property int|null $tenant_id
 * @property-read \App\Models\User|null $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationParameter> $parameters
 * @property-read int|null $parameters_count
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\User|null $updater
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet whereVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterSet withoutTrashed()
 * @mixin \Eloquent
 */
class QualificationParameterSet extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'slug', 'version', 'status', 'description',
        'created_by', 'updated_by',
    ];

    public function parameters(): HasMany
    {
        return $this->hasMany(QualificationParameter::class, 'parameter_set_id')->orderBy('sort_order');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
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
