<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $email
 * @property string $otp
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $used_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereOtp($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|EmailVerificationOtp whereUsedAt($value)
 * @mixin \Eloquent
 */
class EmailVerificationOtp extends Model
{
    protected $fillable = ['email', 'otp', 'expires_at', 'used_at'];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function isValid(): bool
    {
        return ! $this->isExpired() && ! $this->isUsed();
    }
}
