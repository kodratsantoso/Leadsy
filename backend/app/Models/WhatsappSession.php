<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $session_name
 * @property string $status
 * @property string|null $qr_payload
 * @property \Illuminate\Support\Carbon|null $last_qr_generated_at
 * @property \Illuminate\Support\Carbon|null $connected_at
 * @property \Illuminate\Support\Carbon|null $disconnected_at
 * @property array<array-key, mixed>|null $metadata_json
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereConnectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereDisconnectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereLastQrGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereMetadataJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereQrPayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereSessionName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSession whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
