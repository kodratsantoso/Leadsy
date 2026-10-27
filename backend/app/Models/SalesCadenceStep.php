<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesCadenceStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'sales_cadence_id',
        'step_number',
        'delay_days',
        'channel',
        'template_subject',
        'template_body',
        'ai_personalization',
        'is_automated',
    ];

    protected $casts = [
        'step_number' => 'integer',
        'delay_days' => 'integer',
        'ai_personalization' => 'boolean',
        'is_automated' => 'boolean',
    ];

    public function cadence(): BelongsTo
    {
        return $this->belongsTo(SalesCadence::class, 'sales_cadence_id');
    }
}
