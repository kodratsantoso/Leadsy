<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $activity_type
 * @property string|null $description
 * @property \Illuminate\Support\Carbon $activity_date
 * @property string|null $related_entity_type
 * @property int|null $related_entity_id
 * @property int|null $user_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property string|null $outcome
 * @property string|null $activity_date_override
 * @property \Illuminate\Support\Carbon|null $next_follow_up_date
 * @property string|null $budget
 * @property string|null $authority
 * @property string|null $needs
 * @property string|null $timeline
 * @property string|null $competitor
 * @property-read \App\Models\Lead|null $lead
 * @property-read Model|\Eloquent|null $relatedEntity
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereActivityDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereActivityDateOverride($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereActivityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereAuthority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereBudget($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereCompetitor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereNeeds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereNextFollowUpDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereOutcome($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereRelatedEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereRelatedEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereTimeline($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadActivity whereUserId($value)
 * @mixin \Eloquent
 */
class LeadActivity extends Model
{
    protected $fillable = [
        'lead_id', 'activity_type', 'description', 'activity_date',
        'outcome', 'budget', 'authority', 'needs', 'timeline', 'competitor',
        'next_follow_up_date',
        'related_entity_type', 'related_entity_id', 'user_id',
    ];

    protected $casts = [
        'activity_date' => 'datetime',
        'next_follow_up_date' => 'date',
    ];

    protected $touches = ['lead'];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function relatedEntity(): MorphTo
    {
        return $this->morphTo();
    }
}
