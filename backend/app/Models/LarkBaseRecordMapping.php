<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $lark_base_table_id
 * @property string $leadsy_entity_type
 * @property string $leadsy_entity_id
 * @property string $lark_record_id
 * @property \Illuminate\Support\Carbon|null $last_lark_updated_at
 * @property \Illuminate\Support\Carbon|null $last_leadsy_updated_at
 * @property string|null $last_sync_source
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LarkBaseTable $baseTable
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLarkBaseTableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLarkRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLastLarkUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLastLeadsyUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLastSyncSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLeadsyEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereLeadsyEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseRecordMapping whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LarkBaseRecordMapping extends Model
{
    protected $fillable = [
        'tenant_id',
        'lark_base_table_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'lark_record_id',
        'lark_app_token',
        'lark_table_id',
        'leadsy_record_id_value',
        'sync_status',
        'last_synced_at',
        'last_sync_error',
        'last_lark_updated_at',
        'last_leadsy_updated_at',
        'last_sync_source',
    ];

    protected $casts = [
        'last_lark_updated_at' => 'datetime',
        'last_leadsy_updated_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function baseTable(): BelongsTo
    {
        return $this->belongsTo(LarkBaseTable::class, 'lark_base_table_id');
    }
}
