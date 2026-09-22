<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A durable audit trail of every attempt to run the Pre-Meeting AI Screening
 * pipeline for a lead — success or failure, and by what mechanism (the
 * scheduled background command, a manual button, or a manual CLI run).
 * Exists so the "AI Screening Monitor" UI can show real progress and real
 * error messages without needing server log access.
 */
class AiScreeningRun extends Model
{
    protected $fillable = [
        'lead_id',
        'company_name',
        'status',
        'error_message',
        'stages_executed',
        'lead_score',
        'qualification_status',
        'triggered_by',
        'elapsed_seconds',
    ];

    protected $casts = [
        'stages_executed' => 'array',
        'elapsed_seconds' => 'float',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
