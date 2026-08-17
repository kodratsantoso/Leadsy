<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $lark_integration_id
 * @property string $module
 * @property string $action
 * @property string|null $lark_entity_type
 * @property string|null $lark_entity_id
 * @property string|null $leadsy_entity_type
 * @property string|null $leadsy_entity_id
 * @property string $status
 * @property array<array-key, mixed>|null $request_data
 * @property array<array-key, mixed>|null $response_data
 * @property string|null $error_message
 * @property int $retry_count
 * @property \Illuminate\Support\Carbon|null $next_retry_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LarkIntegration|null $larkIntegration
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereLarkEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereLarkEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereLarkIntegrationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereLeadsyEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereLeadsyEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereModule($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereNextRetryAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereRequestData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereResponseData($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereRetryCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSync whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LarkSync extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'tenant_id',
        'lark_integration_id',
        'module',
        'action',
        'lark_entity_type',
        'lark_entity_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'status',
        'request_data',
        'response_data',
        'error_message',
        'retry_count',
        'next_retry_at',
    ];

    protected $casts = [
        'request_data' => 'json',
        'response_data' => 'json',
        'next_retry_at' => 'datetime',
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
     * Mark sync as failed and schedule retry
     */
    public function markFailed(string $errorMessage, int $retryDelaySeconds = 300): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'retry_count' => $this->retry_count + 1,
            'next_retry_at' => now()->addSeconds($retryDelaySeconds),
        ]);
    }

    /**
     * Mark sync as successful
     */
    public function markSuccessful($responseData = null): void
    {
        $this->update([
            'status' => 'success',
            'response_data' => $responseData,
        ]);
    }

    /**
     * Get pending syncs that need retry
     */
    public static function getPendingRetries()
    {
        return static::where('status', 'failed')
            ->whereNotNull('next_retry_at')
            ->where('next_retry_at', '<=', now())
            ->where('retry_count', '<', 5)
            ->get();
    }
}
