<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadProductMatchRun extends Model
{
    protected $fillable = [
        'lead_id', 'triggered_by', 'products_evaluated', 'matches_created',
        'ai_calls_made', 'total_cost_usd', 'duration_ms', 'status', 'error_message', 'run_at',
    ];

    protected $casts = [
        'run_at'            => 'datetime',
        'total_cost_usd'    => 'float',
        'products_evaluated'=> 'integer',
        'matches_created'   => 'integer',
        'ai_calls_made'     => 'integer',
        'duration_ms'       => 'integer',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
