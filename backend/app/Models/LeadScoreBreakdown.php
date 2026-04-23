<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadScoreBreakdown extends Model
{
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'factor',
        'value',
        'weight',
        'score_contribution',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'score_contribution' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
