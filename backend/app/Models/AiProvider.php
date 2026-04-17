<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class AiProvider extends Model
{
    protected $fillable = [
        'name', 'slug', 'base_url', 'api_key_encrypted',
        'organization_id', 'region', 'status', 'environments',
    ];

    protected $casts = [
        'environments' => 'array',
    ];

    protected $hidden = ['api_key_encrypted'];

    /* Encrypt on write, decrypt on read */
    public function setApiKeyEncryptedAttribute(string $value): void
    {
        $this->attributes['api_key_encrypted'] = Crypt::encryptString($value);
    }

    public function getDecryptedApiKeyAttribute(): string
    {
        return Crypt::decryptString($this->attributes['api_key_encrypted']);
    }

    public function models(): HasMany
    {
        return $this->hasMany(AiModel::class);
    }
}
