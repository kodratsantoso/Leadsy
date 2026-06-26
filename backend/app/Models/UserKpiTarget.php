<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserKpiTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kpi_key',
        'target_value',
        'period_type',
        'period_start',
        'period_end',
    ];

    protected $casts = [
        'target_value' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
