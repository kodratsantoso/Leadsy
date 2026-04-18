<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadOutcome extends Model
{
    protected $fillable = [
        'lead_id', 'outcome', 'deal_size',
        'loss_reason', 'loss_category', 'feedback_notes',
        'closed_by', 'closed_at',
    ];

    protected $casts = [
        'deal_size' => 'float',
        'closed_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
