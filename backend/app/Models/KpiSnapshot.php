<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kpi_key',
        'actual_value',
        'target_value',
        'achievement_percentage',
        'period_type',
        'period_start',
        'period_end',
        'generated_at',
    ];

    protected $casts = [
        'actual_value' => 'decimal:2',
        'target_value' => 'decimal:2',
        'achievement_percentage' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
        'generated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
