<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property string $source_system
 * @property string $source_schema
 * @property string $source_table
 * @property string $source_record_id
 * @property string $target_table
 * @property string $target_record_id
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon $imported_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereImportedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereSourceRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereSourceSchema($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereSourceSystem($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereSourceTable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereTargetRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereTargetTable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RecordOriginMapping whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class RecordOriginMapping extends Model
{
    protected $fillable = [
        'tenant_id',
        'source_system',
        'source_schema',
        'source_table',
        'source_record_id',
        'target_table',
        'target_record_id',
        'metadata',
        'imported_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'imported_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
