<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $ai_model_id
 * @property int|null $user_id
 * @property string $function_name
 * @property array<array-key, mixed>|null $prompt_metadata
 * @property array<array-key, mixed>|null $response_metadata
 * @property int|null $prompt_tokens
 * @property int|null $completion_tokens
 * @property float|null $estimated_cost_usd
 * @property int|null $latency_ms
 * @property string $status
 * @property string|null $error_message
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $fallback_used
 * @property-read \App\Models\AiModel|null $aiModel
 * @property-read \App\Models\AiModel|null $model
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereAiModelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereCompletionTokens($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereEstimatedCostUsd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereFallbackUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereFunctionName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereLatencyMs($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest wherePromptMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest wherePromptTokens($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereResponseMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiRequest whereUserId($value)
 * @mixin \Eloquent
 */
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
