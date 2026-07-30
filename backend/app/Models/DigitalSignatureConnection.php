<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

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
