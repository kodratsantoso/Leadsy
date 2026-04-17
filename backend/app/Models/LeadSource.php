<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadSource extends Model
{
    protected $fillable = [
        'lead_id', 'source_type', 'source_ref', 'confidence', 'last_verified_at',
    ];

    protected $casts = ['last_verified_at' => 'date'];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
