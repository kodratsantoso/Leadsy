<?php

namespace App\Models;

use App\Services\Security\ClientTelemetryService;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $fillable = [
        'name',
        'token',
        'abilities',
        'last_used_at',
        'expires_at',
        'ip_address',
        'user_agent',
        'device_type',
        'browser',
        'os',
        'city',
        'country_code',
        'country_name',
        'last_active_at',
    ];

    protected $casts = [
        'abilities' => 'json',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'last_active_at' => 'datetime',
    ];

    protected $appends = [
        'is_idle',
        'idle_minutes',
        'status',
        'flag_emoji',
    ];

    /**
     * User relation when tokenable is User.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tokenable_id');
    }

    /**
     * Determine if session is idle (default threshold 15 mins).
     */
    public function isIdle(int $thresholdMinutes = 15): bool
    {
        $lastActivity = $this->last_active_at ?? $this->last_used_at ?? $this->created_at;
        if (! $lastActivity) {
            return false;
        }

        return $lastActivity->diffInMinutes(now()) >= $thresholdMinutes;
    }

    public function getIsIdleAttribute(): bool
    {
        return $this->isIdle(15);
    }

    public function getIdleMinutesAttribute(): int
    {
        $lastActivity = $this->last_active_at ?? $this->last_used_at ?? $this->created_at;
        if (! $lastActivity) {
            return 0;
        }

        return (int) $lastActivity->diffInMinutes(now());
    }

    public function getStatusAttribute(): string
    {
        return $this->isIdle(15) ? 'idle' : 'active';
    }

    public function getFlagEmojiAttribute(): string
    {
        if (! $this->country_code) {
            return '🌐';
        }

        return app(ClientTelemetryService::class)->countryCodeToEmoji($this->country_code);
    }
}
