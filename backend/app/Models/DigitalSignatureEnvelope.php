<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalSignatureEnvelope extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'request_payload_json' => 'array',
        'response_payload_json' => 'array',
        'last_status_payload_json' => 'array',
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(PsDocument::class, 'document_id');
    }
}
