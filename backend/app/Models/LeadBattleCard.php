<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $competitor_name
 * @property array<array-key, mixed>|null $advantages
 * @property array<array-key, mixed>|null $weaknesses
 * @property array<array-key, mixed>|null $counter_tactics
 * @property array<array-key, mixed>|null $key_talking_points
 * @property array<array-key, mixed>|null $pricing_intelligence
 * @property string $source
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead $lead
 */
class LeadBattleCard extends Model
{
    protected $fillable = [
        'lead_id',
        'competitor_name',
        'advantages',
        'weaknesses',
        'counter_tactics',
        'key_talking_points',
        'pricing_intelligence',
        'source',
        'metadata',
    ];

    protected $casts = [
        'advantages' => 'array',
        'weaknesses' => 'array',
        'counter_tactics' => 'array',
        'key_talking_points' => 'array',
        'pricing_intelligence' => 'array',
        'metadata' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
