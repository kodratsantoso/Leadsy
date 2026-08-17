<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $conversation_id
 * @property string $external_message_id
 * @property string $direction
 * @property string $message_type
 * @property string|null $body
 * @property string|null $reply_to_external_message_id
 * @property array<array-key, mixed>|null $provider_payload_json
 * @property bool $relevance_flag
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $received_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\WhatsappConversation $conversation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereBody($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereConversationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereDirection($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereExternalMessageId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereMessageType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereProviderPayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereReceivedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereRelevanceFlag($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereReplyToExternalMessageId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappMessage whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
