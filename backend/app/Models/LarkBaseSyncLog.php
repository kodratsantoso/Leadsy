<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LarkBaseSyncLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'connection_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'lark_record_id',
        'sync_direction',
        'sync_action',
        'payload_json',
        'response_json',
        'status',
        'error_message',
        'triggered_by',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'response_json' => 'array',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(LarkBaseConnection::class, 'connection_id');
    }
}
