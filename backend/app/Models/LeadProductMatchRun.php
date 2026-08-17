<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $triggered_by
 * @property int $products_evaluated
 * @property int $matches_created
 * @property int $ai_calls_made
 * @property float|null $total_cost_usd
 * @property int|null $duration_ms
 * @property string $status
 * @property string|null $error_message
 * @property \Illuminate\Support\Carbon $run_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\User|null $triggeredBy
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereAiCallsMade($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereDurationMs($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereMatchesCreated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereProductsEvaluated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereRunAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereTotalCostUsd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereTriggeredBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatchRun whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadProductMatchRun extends Model
{
    protected $fillable = [
        'lead_id', 'triggered_by', 'products_evaluated', 'matches_created',
        'ai_calls_made', 'total_cost_usd', 'duration_ms', 'status', 'error_message', 'run_at',
    ];

    protected $casts = [
        'run_at' => 'datetime',
        'total_cost_usd' => 'float',
        'products_evaluated' => 'integer',
        'matches_created' => 'integer',
        'ai_calls_made' => 'integer',
        'duration_ms' => 'integer',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
