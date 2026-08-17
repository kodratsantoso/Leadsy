<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

/**
 * @property int $id
 * @property string $category
 * @property string $key
 * @property string|null $value_encrypted
 * @property string $value_type
 * @property bool $is_secret
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property-read mixed $safe_value
 * @property mixed $value
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereIsSecret($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereValueEncrypted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationConfig whereValueType($value)
 * @mixin \Eloquent
 */
class IntegrationConfig extends Model
{
    protected $fillable = [
        'tenant_id',
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

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Set the unencrypted value into the encrypted column.
     */
    public function setValueAttribute($value)
    {
        $this->attributes['value_encrypted'] = $value !== null ? Crypt::encryptString((string) $value) : null;
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
                return (float) $decrypted;
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
        return $this->value;
    }
}
