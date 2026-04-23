<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
