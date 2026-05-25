<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
