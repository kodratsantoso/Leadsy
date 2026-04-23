<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
