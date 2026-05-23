<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Territory extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'center_lat', 'center_lng', 'radius_meters', 'metadata', 'created_by',
    ];

    protected $casts = [
        'center_lat' => 'float',
        'center_lng' => 'float',
        'radius_meters' => 'integer',
        'metadata' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
