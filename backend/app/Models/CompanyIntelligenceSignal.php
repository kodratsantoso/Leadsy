<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyIntelligenceSignal extends Model
{
    protected $fillable = [
        'lead_id',
        'signal_type',
        'level',
        'score',
        'confidence',
        'evidence_summary',
        'generated_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
