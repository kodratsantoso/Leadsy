<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LarkBaseTable extends Model
{
    protected $fillable = [
        'tenant_id',
        'lark_integration_id',
        'app_token',
        'table_id',
        'table_name',
        'leadsy_entity_type',
        'sync_direction',
        'field_mapping',
        'is_active',
        'last_pull_at',
        'last_push_at',
    ];

    protected $casts = [
        'field_mapping' => 'array',
        'is_active' => 'boolean',
        'last_pull_at' => 'datetime',
        'last_push_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function larkIntegration(): BelongsTo
    {
        return $this->belongsTo(LarkIntegration::class);
    }

    public function recordMappings(): HasMany
    {
        return $this->hasMany(LarkBaseRecordMapping::class);
    }

    public function allowsPush(): bool
    {
        return in_array($this->sync_direction, ['leadsy_to_lark', 'two_way'], true);
    }

    public function allowsPull(): bool
    {
        return in_array($this->sync_direction, ['lark_to_leadsy', 'two_way'], true);
    }
}
