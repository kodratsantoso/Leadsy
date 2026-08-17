<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int|null $created_by
 * @property string $provider
 * @property string|null $provider_account_id
 * @property string|null $provider_account_name
 * @property string $display_name
 * @property string $auth_type
 * @property string $status
 * @property bool $is_enabled
 * @property array<array-key, mixed> $scopes
 * @property array<array-key, mixed> $config
 * @property array<array-key, mixed> $metadata
 * @property \Illuminate\Support\Carbon|null $connected_at
 * @property \Illuminate\Support\Carbon|null $disconnected_at
 * @property \Illuminate\Support\Carbon|null $last_tested_at
 * @property \Illuminate\Support\Carbon|null $last_success_at
 * @property \Illuminate\Support\Carbon|null $last_error_at
 * @property string|null $last_error_code
 * @property string|null $last_error_message
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\User|null $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\IntegrationCredentialStore> $credentials
 * @property-read int|null $credentials_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\IntegrationEntityMapping> $entityMappings
 * @property-read int|null $entity_mappings_count
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\IntegrationWebhookEvent> $webhookEvents
 * @property-read int|null $webhook_events_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereAuthType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereConfig($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereConnectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereDisconnectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereDisplayName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereIsEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereLastErrorAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereLastErrorCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereLastErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereLastSuccessAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereLastTestedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereProviderAccountId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereProviderAccountName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereScopes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConnection withoutTrashed()
 * @mixin \Eloquent
 */
class IntegrationConnection extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'created_by',
        'provider',
        'provider_account_id',
        'provider_account_name',
        'display_name',
        'auth_type',
        'status',
        'is_enabled',
        'scopes',
        'config',
        'metadata',
        'connected_at',
        'disconnected_at',
        'last_tested_at',
        'last_success_at',
        'last_error_at',
        'last_error_code',
        'last_error_message',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'scopes' => 'array',
        'config' => 'array',
        'metadata' => 'array',
        'connected_at' => 'datetime',
        'disconnected_at' => 'datetime',
        'last_tested_at' => 'datetime',
        'last_success_at' => 'datetime',
        'last_error_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(IntegrationCredentialStore::class);
    }

    public function entityMappings(): HasMany
    {
        return $this->hasMany(IntegrationEntityMapping::class);
    }

    public function webhookEvents(): HasMany
    {
        return $this->hasMany(IntegrationWebhookEvent::class);
    }

    public function markActionRequired(string $code, string $message): void
    {
        $this->forceFill([
            'status' => 'action_required',
            'is_enabled' => false,
            'last_error_at' => now(),
            'last_error_code' => $code,
            'last_error_message' => $message,
        ])->save();
    }
}
