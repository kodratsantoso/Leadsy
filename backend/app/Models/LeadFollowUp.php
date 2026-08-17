<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property \Illuminate\Support\Carbon $due_date
 * @property string $status
 * @property string|null $purpose
 * @property int|null $assigned_to
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignee
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereAssignedTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereDueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp wherePurpose($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFollowUp whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadFollowUp extends Model
{
    protected $fillable = [
        'lead_id', 'due_date', 'status', 'purpose', 'assigned_to',
    ];

    protected $casts = [
        'due_date' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
