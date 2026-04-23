<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'tenant_id', 'user_id', 'action', 'module', 'record_type', 'record_id',
        'before_value', 'after_value', 'ip_address', 'user_agent',
        'request_method', 'route_path', 'status', 'metadata_json',
    ];

    protected $casts = [
        'before_value' => 'array',
        'after_value'  => 'array',
        'metadata_json' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
