<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadContactPayload extends Model
{
    protected $fillable = [
        'contact_id',
        'source_type',
        'raw_payload',
    ];

    protected $casts = [
        'raw_payload' => 'array',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(LeadContact::class, 'contact_id');
    }
}
