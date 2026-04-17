<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadQualification extends Model
{
    protected $fillable = [
        'lead_id', 'qualified', 'business_type', 'company_size_band',
        'qualification_reason', 'last_qualified_at',
    ];

    protected $casts = [
        'last_qualified_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
