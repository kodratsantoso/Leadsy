<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rules\Password;

class SecuritySetting extends Model
{
    protected $fillable = [
        'tenant_id',
        'session_timeout_minutes',
        'password_min_length',
        'password_require_uppercase',
        'password_require_special',
    ];

    protected $casts = [
        'session_timeout_minutes' => 'integer',
        'password_min_length' => 'integer',
        'password_require_uppercase' => 'boolean',
        'password_require_special' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Build a Password validation rule from this setting, for use wherever
     * a user's password is set (registration, admin create/update user,
     * self-service change password).
     */
    public function passwordRule(): Password
    {
        $rule = Password::min(max(8, $this->password_min_length ?? 8));

        if ($this->password_require_uppercase) {
            $rule = $rule->mixedCase();
        }

        if ($this->password_require_special) {
            $rule = $rule->symbols();
        }

        return $rule;
    }

    /**
     * Resolve the effective setting for a tenant: tenant-specific row if it
     * exists, else the global (tenant_id null) row, else a safe in-memory
     * default (no timeout, min 8 chars, no complexity requirements) — this
     * default matches pre-feature behavior exactly, so nothing changes for
     * anyone until an admin actually saves a setting.
     */
    public static function resolve(?int $tenantId): self
    {
        $setting = ($tenantId ? static::where('tenant_id', $tenantId)->first() : null)
            ?? static::whereNull('tenant_id')->first();

        return $setting ?? new static([
            'session_timeout_minutes' => null,
            'password_min_length' => 8,
            'password_require_uppercase' => false,
            'password_require_special' => false,
        ]);
    }
}
