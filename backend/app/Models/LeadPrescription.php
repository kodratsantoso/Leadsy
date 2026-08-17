<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $recommended_owner_id
 * @property string $recommended_approach
 * @property string $next_best_action
 * @property string $follow_up_timing
 * @property int $priority_score
 * @property string|null $reasoning
 * @property bool $is_applied
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\User|null $recommendedOwner
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereFollowUpTiming($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereIsApplied($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereNextBestAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription wherePriorityScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereReasoning($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereRecommendedApproach($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereRecommendedOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPrescription whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadPrescription extends Model
{
    protected $fillable = [
        'lead_id', 'recommended_owner_id',
        'recommended_approach', 'next_best_action', 'follow_up_timing',
        'priority_score', 'reasoning', 'is_applied',
    ];

    protected $casts = [
        'priority_score' => 'integer',
        'is_applied' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function recommendedOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recommended_owner_id');
    }
}
