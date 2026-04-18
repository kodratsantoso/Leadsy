<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevenueRule extends Model
{
    protected $fillable = [
        'name', 'description', 'condition_type', 'condition_value',
        'action', 'severity', 'is_active', 'priority', 'created_by',
    ];

    protected $casts = [
        'condition_value' => 'array',
        'is_active'       => 'boolean',
        'priority'        => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
