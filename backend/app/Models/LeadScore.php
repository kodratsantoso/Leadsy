<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $score
 * @property string|null $grade
 * @property array<array-key, mixed>|null $score_breakdown
 * @property \Illuminate\Support\Carbon $last_scored_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property \Illuminate\Support\Carbon|null $calculated_at
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereCalculatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereGrade($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereLastScoredAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereScoreBreakdown($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScore whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadScore extends Model
{
    protected $fillable = [
        'lead_id', 'score', 'grade', 'score_breakdown', 'calculated_at', 'last_scored_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'score_breakdown' => 'array',
        'calculated_at' => 'datetime',
        'last_scored_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
