<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
