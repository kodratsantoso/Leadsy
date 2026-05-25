<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Casts\AsCollection;

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
        'is_active',
        'last_sync_at',
        'sync_status',
    ];

    protected $casts = [
        'features' => 'json',
        'enabled_modules' => 'json',
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
