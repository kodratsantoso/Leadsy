<?php

namespace App\Models;

use App\Services\Integrations\IntegrationCredentialCryptor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $integration_connection_id
 * @property string $credential_type
 * @property string $key_name
 * @property string $encrypted_value
 * @property string $encryption_key_id
 * @property string|null $value_fingerprint
 * @property string|null $last4
 * @property array<array-key, mixed> $metadata
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $rotated_at
 * @property \Illuminate\Support\Carbon|null $revoked_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\IntegrationConnection|null $connection
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereCredentialType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereEncryptedValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereEncryptionKeyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereIntegrationConnectionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereKeyName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereLast4($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereRevokedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereRotatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore whereValueFingerprint($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationCredentialStore withoutTrashed()
 * @mixin \Eloquent
 */
class IntegrationCredentialStore extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'integration_connection_id',
        'credential_type',
        'key_name',
        'encrypted_value',
        'encryption_key_id',
        'value_fingerprint',
        'last4',
        'metadata',
        'expires_at',
        'rotated_at',
        'revoked_at',
    ];

    protected $hidden = [
        'encrypted_value',
        'value_fingerprint',
    ];

    protected $casts = [
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'rotated_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnection::class, 'integration_connection_id');
    }

    public function aad(): string
    {
        return implode('|', [
            'tenant:'.$this->tenant_id,
            'connection:'.$this->integration_connection_id,
            'type:'.$this->credential_type,
            'key:'.$this->key_name,
        ]);
    }

    public function storeSecret(string $value, ?IntegrationCredentialCryptor $cryptor = null): void
    {
        $cryptor ??= app(IntegrationCredentialCryptor::class);
        $this->encrypted_value = $cryptor->encryptString($value, $this->aad());
        $this->encryption_key_id = (string) config('integrations.credential_key_id', 'primary');
        $this->value_fingerprint = $cryptor->fingerprint($value, $this->aad());
        $this->last4 = substr($value, -4);
        $this->rotated_at = now();
    }

    public function revealSecret(?IntegrationCredentialCryptor $cryptor = null): string
    {
        $cryptor ??= app(IntegrationCredentialCryptor::class);

        return $cryptor->decryptString($this->encrypted_value, $this->aad());
    }
}
