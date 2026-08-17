<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $app_id
 * @property string|null $app_secret_encrypted
 * @property string|null $verification_token_encrypted
 * @property string|null $encrypt_key_encrypted
 * @property string|null $base_url
 * @property array<array-key, mixed> $features
 * @property array<array-key, mixed> $enabled_modules
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $last_sync_at
 * @property string|null $sync_status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property array<array-key, mixed> $meeting_summary_mapping
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkBaseTable> $baseTables
 * @property-read int|null $base_tables_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkEvent> $events
 * @property-read int|null $events_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkSsoUser> $ssoUsers
 * @property-read int|null $sso_users_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkSync> $syncs
 * @property-read int|null $syncs_count
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereAppId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereAppSecretEncrypted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereBaseUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereEnabledModules($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereEncryptKeyEncrypted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereFeatures($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereLastSyncAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereMeetingSummaryMapping($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereSyncStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration whereVerificationTokenEncrypted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkIntegration withoutTrashed()
 * @mixin \Eloquent
 */
class LarkIntegration extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'app_id',
        'app_secret_encrypted',
        'verification_token_encrypted',
        'encrypt_key_encrypted',
        'base_url',
        'features',
        'enabled_modules',
        'meeting_summary_mapping',
        'is_active',
        'last_sync_at',
        'sync_status',
    ];

    protected $casts = [
        'features' => 'json',
        'enabled_modules' => 'json',
        'meeting_summary_mapping' => 'json',
        'is_active' => 'boolean',
        'last_sync_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function syncs(): HasMany
    {
        return $this->hasMany(LarkSync::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(LarkEvent::class);
    }

    public function ssoUsers(): HasMany
    {
        return $this->hasMany(LarkSsoUser::class);
    }

    public function baseTables(): HasMany
    {
        return $this->hasMany(LarkBaseTable::class);
    }

    /**
     * Check if a specific module is enabled
     */
    public function isModuleEnabled(string $module): bool
    {
        $enabled = $this->enabled_modules ?? [];

        return $enabled[$module] ?? false;
    }

    /**
     * Enable a module
     */
    public function enableModule(string $module): void
    {
        $enabled = $this->enabled_modules ?? [];
        $enabled[$module] = true;
        $this->update(['enabled_modules' => $enabled]);
    }

    /**
     * Disable a module
     */
    public function disableModule(string $module): void
    {
        $enabled = $this->enabled_modules ?? [];
        $enabled[$module] = false;
        $this->update(['enabled_modules' => $enabled]);
    }
}
