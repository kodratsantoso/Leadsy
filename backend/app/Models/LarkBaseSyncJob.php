<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $transcript_id
 * @property int|null $connection_id
 * @property string|null $lark_record_id
 * @property string $sync_type
 * @property string $status
 * @property string|null $mapped_fields_json
 * @property array<array-key, mixed>|null $payload_json
 * @property array<array-key, mixed>|null $response_json
 * @property string|null $error_message
 * @property int $retry_count
 * @property \Illuminate\Support\Carbon|null $last_attempt_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LeadTranscript|null $transcript
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereConnectionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereLarkRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereLastAttemptAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereMappedFieldsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob wherePayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereResponseJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereRetryCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereSyncType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereTranscriptId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseSyncJob whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
