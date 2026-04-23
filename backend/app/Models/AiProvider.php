<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;

class AiProvider extends Model
{
    protected $fillable = [
        'name', 'slug', 'provider_type', 'base_url', 'api_key_encrypted', 'api_key_last4',
        'organization_id', 'project_id', 'default_model', 'region', 'status', 'environments',
        'timeout_seconds', 'retry_limit', 'max_tokens_default', 'cache_ttl_minutes', 'cost_sensitivity',
        'last_tested_at', 'last_test_status', 'last_test_message', 'last_used_at', 'last_used_model',
    ];

    protected $casts = [
        'environments' => 'array',
        'last_tested_at' => 'datetime',
        'last_used_at' => 'datetime',
    ];

    protected $hidden = ['api_key_encrypted'];

    /* Encrypt on write, decrypt on read */
    public function setApiKeyEncryptedAttribute(?string $value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['api_key_encrypted'] = $value;
            $this->attributes['api_key_last4'] = null;
            return;
        }

        $this->attributes['api_key_encrypted'] = Crypt::encryptString($value);
        $this->attributes['api_key_last4'] = substr($value, -4);
    }

    public function getDecryptedApiKeyAttribute(): ?string
    {
        $value = Arr::get($this->attributes, 'api_key_encrypted');
        if (! $value) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    public function models(): HasMany
    {
        return $this->hasMany(AiModel::class);
    }

    public function connectionTests(): HasMany
    {
        return $this->hasMany(AiConnectionTest::class);
    }

    public function maskApiKey(): string
    {
        if (! $this->api_key_last4) {
            return 'Not configured';
        }

        return 'sk-****-****-' . $this->api_key_last4;
    }

    public function hasConfiguredKey(): bool
    {
        $key = $this->decrypted_api_key;

        return filled($key) && ! str_contains(strtoupper($key), 'PLACEHOLDER');
    }
}
