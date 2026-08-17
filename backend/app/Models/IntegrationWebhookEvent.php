<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property int|null $integration_connection_id
 * @property string $provider
 * @property string|null $event_type
 * @property string|null $external_event_id
 * @property string $idempotency_key
 * @property string $payload_hash
 * @property array<array-key, mixed> $payload
 * @property array<array-key, mixed>|null $headers
 * @property string $status
 * @property int $attempts
 * @property string|null $processing_error
 * @property \Illuminate\Support\Carbon $received_at
 * @property \Illuminate\Support\Carbon|null $processed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\IntegrationConnection|null $connection
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereAttempts($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereEventType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereExternalEventId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereHeaders($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereIdempotencyKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereIntegrationConnectionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent wherePayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent wherePayloadHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereProcessedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereProcessingError($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereReceivedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IntegrationWebhookEvent whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
