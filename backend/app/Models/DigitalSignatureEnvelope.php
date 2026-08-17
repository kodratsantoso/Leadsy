<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $document_id
 * @property string $provider_name
 * @property string $provider_envelope_id
 * @property string|null $provider_document_id
 * @property string $status
 * @property array<array-key, mixed>|null $request_payload_json
 * @property array<array-key, mixed>|null $response_payload_json
 * @property array<array-key, mixed>|null $last_status_payload_json
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property string|null $error_message
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsDocument $document
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereCompletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereLastStatusPayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereProviderDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereProviderEnvelopeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereProviderName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereRequestPayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereResponsePayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DigitalSignatureEnvelope whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
