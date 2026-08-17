<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * @property int $id
 * @property string $provider_name
 * @property string $base_url
 * @property string $encrypted_api_key
 * @property string|null $encrypted_webhook_secret
 * @property int $default_expiry_days
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property mixed $api_key
 * @property mixed $webhook_secret
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereBaseUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereDefaultExpiryDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereEncryptedApiKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereEncryptedWebhookSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereProviderName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureConnection whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class DigitalSignatureConnection extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'encrypted_api_key',
        'encrypted_webhook_secret'
    ];

    // Accessors for decryption
    public function getApiKeyAttribute()
    {
        return $this->encrypted_api_key ? Crypt::decryptString($this->encrypted_api_key) : null;
    }

    public function getWebhookSecretAttribute()
    {
        return $this->encrypted_webhook_secret ? Crypt::decryptString($this->encrypted_webhook_secret) : null;
    }

    // Mutators for encryption
    public function setApiKeyAttribute($value)
    {
        $this->attributes['encrypted_api_key'] = Crypt::encryptString($value);
    }

    public function setWebhookSecretAttribute($value)
    {
        if ($value) {
            $this->attributes['encrypted_webhook_secret'] = Crypt::encryptString($value);
        } else {
            $this->attributes['encrypted_webhook_secret'] = null;
        }
    }
}
