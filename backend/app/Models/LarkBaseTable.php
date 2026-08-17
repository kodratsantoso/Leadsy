<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $lark_integration_id
 * @property string $app_token
 * @property string $table_id
 * @property string|null $table_name
 * @property string $leadsy_entity_type
 * @property string $sync_direction
 * @property array<array-key, mixed> $field_mapping
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $last_pull_at
 * @property \Illuminate\Support\Carbon|null $last_push_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LarkIntegration|null $larkIntegration
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkBaseRecordMapping> $recordMappings
 * @property-read int|null $record_mappings_count
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereAppToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereFieldMapping($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereLarkIntegrationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereLastPullAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereLastPushAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereLeadsyEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereSyncDirection($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereTableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereTableName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkBaseTable whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
