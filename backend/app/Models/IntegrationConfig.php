<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class IntegrationConfig extends Model
{
    protected $fillable = [
        'category',
        'key',
        'value',           // virtual — triggers setValueAttribute mutator → encrypts into value_encrypted
        'value_encrypted', // direct column — kept for backward compat / seeder usage
        'value_type',
        'is_secret',
        'is_active',
    ];

    protected $casts = [
        'is_secret' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Set the unencrypted value into the encrypted column.
     */
    public function setValueAttribute($value)
    {
        $this->attributes['value_encrypted'] = $value !== null ? Crypt::encryptString((string)$value) : null;
    }

    /**
     * Get the decrypted value. If it's a secret, optionally mask it.
     */
    public function getValueAttribute()
    {
        if ($this->value_encrypted === null) {
            return null;
        }

        try {
            $decrypted = Crypt::decryptString($this->value_encrypted);
            
            if ($this->value_type === 'boolean') {
                return $decrypted === '1' || $decrypted === 'true';
            }
            if ($this->value_type === 'number') {
                return (float)$decrypted;
            }
            if ($this->value_type === 'json') {
                return json_decode($decrypted, true);
            }
            
            return $decrypted;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Retrieve a masked string for safe UI transport.
     */
    public function getSafeValueAttribute()
    {
        $val = $this->value;
        if ($val === null) return null;

        if ($this->is_secret && is_string($val)) {
            if (strlen($val) <= 4) return '••••';
            return str_repeat('•', 20) . substr($val, -4);
        }

        return $val;
    }
}
