<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesVisit extends Model
{
    protected $fillable = [
        'lead_id',
        'user_id',
        'status',
        'clock_in_at',
        'clock_out_at',
        'clock_in_lat',
        'clock_in_lng',
        'clock_out_lat',
        'clock_out_lng',
        'clock_in_accuracy_m',
        'clock_out_accuracy_m',
        'clock_in_distance_m',
        'clock_out_distance_m',
        'risk_status',
        'risk_signals',
        'device_metadata',
        'visit_result',
        'notes',
        'client_name',
        'client_title',
        'signature_captured_at',
    ];

    protected $casts = [
        'clock_in_at' => 'datetime',
        'clock_out_at' => 'datetime',
        'clock_in_lat' => 'float',
        'clock_in_lng' => 'float',
        'clock_out_lat' => 'float',
        'clock_out_lng' => 'float',
        'risk_signals' => 'array',
        'device_metadata' => 'array',
        'signature_captured_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(SalesVisitMedia::class);
    }
}
