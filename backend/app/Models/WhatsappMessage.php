<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappMessage extends Model
{
    protected $fillable = [
        'conversation_id',
        'external_message_id',
        'direction',
        'message_type',
        'body',
        'reply_to_external_message_id',
        'provider_payload_json',
        'relevance_flag',
        'sent_at',
        'received_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'received_at' => 'datetime',
        'relevance_flag' => 'boolean',
        'provider_payload_json' => 'array',
    ];

    public function conversation()
    {
        return $this->belongsTo(WhatsappConversation::class, 'conversation_id');
    }
}
