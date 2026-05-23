<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
