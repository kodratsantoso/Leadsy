<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiModel extends Model
{
    protected $fillable = [
        'ai_provider_id', 'name', 'context_window',
        'capabilities', 'cost_tier', 'default_usage_type', 'status',
    ];

    protected $casts = [
        'capabilities'   => 'array',
        'context_window' => 'integer',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function aiProvider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function featureRoutes()
    {
        return $this->hasMany(AiFeatureRoute::class, 'ai_model_id');
    }
}
