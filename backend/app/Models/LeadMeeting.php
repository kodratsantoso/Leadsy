<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

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
