<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
