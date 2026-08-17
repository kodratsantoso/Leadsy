<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $ai_provider_id
 * @property string $name
 * @property int|null $context_window
 * @property array<array-key, mixed>|null $capabilities
 * @property string $cost_tier
 * @property string|null $default_usage_type
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AiProvider $aiProvider
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AiFeatureRoute> $featureRoutes
 * @property-read int|null $feature_routes_count
 * @property-read \App\Models\AiProvider $provider
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereAiProviderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereCapabilities($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereContextWindow($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereCostTier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereDefaultUsageType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiModel whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AiModel extends Model
{
    protected $fillable = [
        'ai_provider_id', 'name', 'context_window',
        'capabilities', 'cost_tier', 'default_usage_type', 'status',
    ];

    protected $casts = [
        'capabilities' => 'array',
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
