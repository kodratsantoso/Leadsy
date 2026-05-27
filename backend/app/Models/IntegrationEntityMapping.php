<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationEntityMapping extends Model
{
    protected $fillable = [
        'tenant_id',
        'integration_connection_id',
        'provider',
        'external_entity_type',
        'external_entity_id',
        'leadsy_entity_type',
        'leadsy_entity_id',
        'metadata',
        'last_synced_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'last_synced_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connection(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnection::class, 'integration_connection_id');
    }
}
