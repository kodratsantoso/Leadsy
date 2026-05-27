<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

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
