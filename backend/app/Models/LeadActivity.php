<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

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
