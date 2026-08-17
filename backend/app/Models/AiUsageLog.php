<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property int|null $user_id
 * @property string $action
 * @property string $provider
 * @property string $model
 * @property int $tokens_prompt
 * @property int $tokens_completion
 * @property int $tokens_total
 * @property numeric $estimated_cost_usd
 * @property bool $has_web_search
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereEstimatedCostUsd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereHasWebSearch($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereTokensCompletion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereTokensPrompt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereTokensTotal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiUsageLog whereUserId($value)
 * @mixin \Eloquent
 */
class AiUsageLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'action',
        'provider',
        'model',
        'tokens_prompt',
        'tokens_completion',
        'tokens_total',
        'estimated_cost_usd',
        'has_web_search',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'has_web_search' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
