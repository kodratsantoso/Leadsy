<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiModelRoute extends Model
{
    protected $fillable = [
        'function_name', 'primary_model_id', 'fallback_model_id',
        'retry_count', 'timeout_seconds', 'is_active',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'retry_count'     => 'integer',
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
