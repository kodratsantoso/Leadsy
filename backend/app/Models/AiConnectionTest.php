<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $ai_provider_id
 * @property int|null $tested_by
 * @property bool $success
 * @property int|null $http_status
 * @property int|null $latency_ms
 * @property string|null $message
 * @property array<array-key, mixed>|null $response_metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AiProvider $provider
 * @property-read \App\Models\User|null $tester
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereAiProviderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereHttpStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereLatencyMs($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereResponseMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereSuccess($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereTestedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiConnectionTest whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AiConnectionTest extends Model
{
    protected $fillable = [
        'ai_provider_id',
        'tested_by',
        'success',
        'http_status',
        'latency_ms',
        'message',
        'response_metadata',
    ];

    protected $casts = [
        'success' => 'boolean',
        'http_status' => 'integer',
        'latency_ms' => 'integer',
        'response_metadata' => 'array',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function tester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tested_by');
    }
}
