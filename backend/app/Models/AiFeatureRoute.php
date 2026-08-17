<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $feature_name
 * @property int $ai_model_id
 * @property int $priority
 * @property int $max_retries
 * @property int $timeout_seconds
 * @property string $cost_sensitivity
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $cache_ttl_minutes
 * @property int|null $max_tokens
 * @property string $complexity_mode
 * @property-read \App\Models\AiModel $aiModel
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereAiModelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereCacheTtlMinutes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereComplexityMode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereCostSensitivity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereFeatureName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereMaxRetries($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereMaxTokens($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereTimeoutSeconds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiFeatureRoute whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AiFeatureRoute extends Model
{
    protected $fillable = [
        'feature_name', 'ai_model_id', 'priority', 'max_retries',
        'timeout_seconds', 'cache_ttl_minutes', 'max_tokens', 'complexity_mode',
        'cost_sensitivity', 'is_active',
    ];

    protected $casts = [
        'priority' => 'integer',
        'max_retries' => 'integer',
        'timeout_seconds' => 'integer',
        'cache_ttl_minutes' => 'integer',
        'max_tokens' => 'integer',
        'is_active' => 'boolean',
    ];

    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class);
    }
}
