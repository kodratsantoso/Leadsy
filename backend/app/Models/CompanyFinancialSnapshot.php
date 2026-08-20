<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyFinancialSnapshot extends Model
{
    protected $fillable = [
        'lead_id',
        'period_type',
        'fiscal_year',
        'period_end_date',
        'currency',
        'metric',
        'raw_value',
        'normalized_value',
        'source_url',
        'retrieved_at',
    ];

    protected $casts = [
        'period_end_date' => 'date',
        'raw_value' => 'decimal:2',
        'normalized_value' => 'decimal:2',
        'retrieved_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
