<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property float $center_lat
 * @property float $center_lng
 * @property int $radius_meters
 * @property array<array-key, mixed>|null $metadata
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereCenterLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereCenterLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereRadiusMeters($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Territory whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class Territory extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'center_lat', 'center_lng', 'radius_meters', 'metadata', 'created_by',
    ];

    protected $casts = [
        'center_lat' => 'float',
        'center_lng' => 'float',
        'radius_meters' => 'integer',
        'metadata' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
