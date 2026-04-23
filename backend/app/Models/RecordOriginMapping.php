<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
