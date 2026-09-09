<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $overall_score
 * @property string $health_status
 * @property int $activity_score
 * @property int $onboarding_score
 * @property int $sentiment_score
 * @property int $relationship_score
 * @property array<array-key, mixed>|null $factors_json
 * @property string|null $summary
 * @property string $trend
 * @property \Illuminate\Support\Carbon|null $calculated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead $lead
 */
class CustomerHealthScore extends Model
{
    protected $fillable = [
        'lead_id',
        'overall_score',
        'health_status',
        'activity_score',
        'onboarding_score',
        'sentiment_score',
        'relationship_score',
        'factors_json',
        'summary',
        'trend',
        'calculated_at',
    ];

    protected $casts = [
        'overall_score' => 'integer',
        'activity_score' => 'integer',
        'onboarding_score' => 'integer',
        'sentiment_score' => 'integer',
        'relationship_score' => 'integer',
        'factors_json' => 'array',
        'calculated_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
