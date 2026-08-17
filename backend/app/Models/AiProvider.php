<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Crypt;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $base_url
 * @property string $api_key_encrypted
 * @property string|null $organization_id
 * @property string|null $region
 * @property string $status
 * @property array<array-key, mixed>|null $environments
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $provider_type
 * @property string|null $api_key_last4
 * @property string|null $project_id
 * @property string|null $default_model
 * @property int $timeout_seconds
 * @property int $retry_limit
 * @property int|null $max_tokens_default
 * @property int|null $cache_ttl_minutes
 * @property string $cost_sensitivity
 * @property \Illuminate\Support\Carbon|null $last_tested_at
 * @property string|null $last_test_status
 * @property string|null $last_test_message
 * @property \Illuminate\Support\Carbon|null $last_used_at
 * @property string|null $last_used_model
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AiConnectionTest> $connectionTests
 * @property-read int|null $connection_tests_count
 * @property-read string|null $decrypted_api_key
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AiModel> $models
 * @property-read int|null $models_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereApiKeyEncrypted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereApiKeyLast4($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereBaseUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereCacheTtlMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereCostSensitivity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereDefaultModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereEnvironments($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereLastTestMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereLastTestStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereLastTestedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereLastUsedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereLastUsedModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereMaxTokensDefault($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereOrganizationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereProjectId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereProviderType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereRegion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereRetryLimit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereTimeoutSeconds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiProvider whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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

        for ($depth = 0; $depth < 5; $depth++) {
            try {
                $decrypted = Crypt::decryptString($value);
            } catch (\Throwable) {
                return $value;
            }

            if ($decrypted === $value || ! str_starts_with($decrypted, 'eyJpdiI6')) {
                return $decrypted;
            }

            $value = $decrypted;
        }

        return $value;
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

        return 'sk-****-****-'.$this->api_key_last4;
    }

    public function hasConfiguredKey(): bool
    {
        $key = $this->decrypted_api_key;

        return filled($key) && ! str_contains(strtoupper($key), 'PLACEHOLDER');
    }
}
