<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $lark_integration_id
 * @property string $event_type
 * @property string|null $lark_entity_type
 * @property string|null $lark_entity_id
 * @property array<array-key, mixed>|null $event_data
 * @property string $status
 * @property string|null $processing_error
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LarkIntegration|null $larkIntegration
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereEventData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereEventType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereLarkEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereLarkEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereLarkIntegrationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereProcessingError($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkEvent whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LarkEvent extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'tenant_id',
        'lark_integration_id',
        'event_type',
        'lark_entity_type',
        'lark_entity_id',
        'event_data',
        'status',
        'processing_error',
    ];

    protected $casts = [
        'event_data' => 'json',
    ];

    public function larkIntegration(): BelongsTo
    {
        return $this->belongsTo(LarkIntegration::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Mark event as processed
     */
    public function markProcessed(): void
    {
        $this->update(['status' => 'processed']);
    }

    /**
     * Mark event as failed with error
     */
    public function markFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'processing_error' => $error,
        ]);
    }
}
