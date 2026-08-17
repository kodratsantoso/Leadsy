<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $integration_connection_id
 * @property string $provider
 * @property string $external_entity_type
 * @property string $external_entity_id
 * @property string $leadsy_entity_type
 * @property int $leadsy_entity_id
 * @property array<array-key, mixed> $metadata
 * @property \Illuminate\Support\Carbon|null $last_synced_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\IntegrationConnection|null $connection
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereExternalEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereExternalEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereIntegrationConnectionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereLastSyncedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereLeadsyEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereLeadsyEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationEntityMapping whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class IntegrationEntityMapping extends Model
{
    protected $fillable = [
        'tenant_id',
        'integration_connection_id',
        'provider',
        'external_entity_type',
        'external_entity_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'metadata',
        'last_synced_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnection::class, 'integration_connection_id');
    }
}
