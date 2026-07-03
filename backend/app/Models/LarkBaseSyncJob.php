<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LarkBaseSyncJob extends Model
{
    protected $fillable = [
        'lead_id',
        'transcript_id',
        'connection_id',
        'sync_type',
        'lark_record_id',
        'status',
        'error_message',
        'payload_json',
        'response_json',
        'retry_count',
        'last_attempt_at',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'response_json' => 'array',
        'last_attempt_at' => 'datetime',
    ];

    public function transcript()
    {
        return $this->belongsTo(LeadTranscript::class);
    }
}
