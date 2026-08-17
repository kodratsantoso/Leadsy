<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $icp_profile_id
 * @property float $match_score
 * @property string $match_level
 * @property array<array-key, mixed>|null $score_breakdown
 * @property \Illuminate\Support\Carbon|null $evaluated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\IcpProfile $icpProfile
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereEvaluatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereIcpProfileId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereMatchLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereMatchScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereScoreBreakdown($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpMatch whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadIcpMatch extends Model
{
    protected $fillable = [
        'lead_id', 'icp_profile_id',
        'match_score', 'match_level', 'score_breakdown', 'evaluated_at',
    ];

    protected $casts = [
        'match_score' => 'float',
        'score_breakdown' => 'array',
        'evaluated_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function icpProfile(): BelongsTo
    {
        return $this->belongsTo(IcpProfile::class);
    }
}
