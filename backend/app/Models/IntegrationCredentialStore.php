<?php

namespace App\Models;

use App\Services\Integrations\IntegrationCredentialCryptor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

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
