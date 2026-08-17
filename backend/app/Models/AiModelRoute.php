<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $function_name
 * @property int $primary_model_id
 * @property int|null $fallback_model_id
 * @property int $retry_count
 * @property int $timeout_seconds
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AiModel|null $fallbackModel
 * @property-read \App\Models\AiModel $primaryModel
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereFallbackModelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereFunctionName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute wherePrimaryModelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereRetryCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereTimeoutSeconds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModelRoute whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AiModelRoute extends Model
{
    protected $fillable = [
        'function_name', 'primary_model_id', 'fallback_model_id',
        'retry_count', 'timeout_seconds', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'retry_count' => 'integer',
        'timeout_seconds' => 'integer',
    ];

    public function primaryModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class, 'primary_model_id');
    }

    public function fallbackModel(): BelongsTo
    {
        return $this->belongsTo(AiModel::class, 'fallback_model_id');
    }
}
