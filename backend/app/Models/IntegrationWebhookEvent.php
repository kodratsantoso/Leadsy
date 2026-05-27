<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationWebhookEvent extends Model
{
    protected $fillable = [
        'tenant_id',
        'integration_connection_id',
        'provider',
        'event_type',
        'external_event_id',
        'idempotency_key',
        'payload_hash',
        'payload',
        'headers',
        'status',
        'attempts',
        'processing_error',
        'received_at',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'headers' => 'array',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnection::class, 'integration_connection_id');
    }

    public static function makeIdempotencyKey(string $provider, ?string $externalEventId, string $rawPayload): string
    {
        return hash('sha256', implode('|', [
            strtolower($provider),
            $externalEventId ?: 'payload',
            hash('sha256', $rawPayload),
        ]));
    }
}
