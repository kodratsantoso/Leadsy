<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRequest extends Model
{
    protected $fillable = [
        'ai_model_id', 'user_id', 'function_name',
        'prompt_metadata', 'response_metadata',
        'prompt_tokens', 'completion_tokens',
        'estimated_cost_usd', 'latency_ms', 'status', 'error_message', 'fallback_used',
    ];

    protected $casts = [
        'prompt_metadata' => 'array',
        'response_metadata' => 'array',
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'estimated_cost_usd' => 'float',
        'latency_ms' => 'integer',
        'fallback_used' => 'boolean',
    ];

    public function model(): BelongsTo
    {
        return $this->belongsTo(AiModel::class, 'ai_model_id');
    }

    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class, 'ai_model_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
