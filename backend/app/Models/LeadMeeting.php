<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property int $id
 * @property int $lead_id
 * @property \Illuminate\Support\Carbon $meeting_date
 * @property string|null $meeting_type
 * @property array<array-key, mixed>|null $participants
 * @property string|null $summary
 * @property array<array-key, mixed>|null $key_points
 * @property array<array-key, mixed>|null $objections
 * @property array<array-key, mixed>|null $next_steps
 * @property \Illuminate\Support\Carbon|null $follow_up_date
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadActivity> $activities
 * @property-read int|null $activities_count
 * @property-read \App\Models\User|null $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadAiEvaluation> $evaluations
 * @property-read int|null $evaluations_count
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereFollowUpDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereKeyPoints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereMeetingDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereMeetingType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereNextSteps($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereObjections($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereParticipants($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadMeeting whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadMeeting extends Model
{
    protected $fillable = [
        'lead_id', 'meeting_date', 'meeting_type', 'participants',
        'summary', 'key_points', 'objections', 'next_steps',
        'follow_up_date', 'created_by',
    ];

    protected $casts = [
        'meeting_date' => 'datetime',
        'follow_up_date' => 'date',
        'participants' => 'array',
        'key_points' => 'array',
        'objections' => 'array',
        'next_steps' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function evaluations(): MorphMany
    {
        return $this->morphMany(LeadAiEvaluation::class, 'source');
    }

    public function activities(): MorphMany
    {
        return $this->morphMany(LeadActivity::class, 'related_entity');
    }
}
