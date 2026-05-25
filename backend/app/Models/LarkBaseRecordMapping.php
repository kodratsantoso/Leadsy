<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LarkBaseRecordMapping extends Model
{
    protected $fillable = [
        'tenant_id',
        'lark_base_table_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'lark_record_id',
        'last_lark_updated_at',
        'last_leadsy_updated_at',
        'last_sync_source',
    ];

    protected $casts = [
        'last_lark_updated_at' => 'datetime',
        'last_leadsy_updated_at' => 'datetime',
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
