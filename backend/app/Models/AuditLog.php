<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id', 'action', 'module', 'record_type', 'record_id',
        'before_value', 'after_value', 'ip_address', 'user_agent',
    ];

    protected $casts = [
        'before_value' => 'array',
        'after_value'  => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
