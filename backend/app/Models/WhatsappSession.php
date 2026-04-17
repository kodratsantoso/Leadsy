<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappSession extends Model
{
    protected $fillable = [
        'session_name',
        'status',
        'qr_payload',
        'last_qr_generated_at',
        'connected_at',
        'disconnected_at',
        'metadata_json',
    ];

    protected $casts = [
        'last_qr_generated_at' => 'datetime',
        'connected_at' => 'datetime',
        'disconnected_at' => 'datetime',
        'metadata_json' => 'array',
    ];
}
