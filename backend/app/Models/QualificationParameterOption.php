<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualificationParameterOption extends Model
{
    protected $fillable = [
        'parameter_id', 'option_value', 'label', 'score',
        'sort_order', 'is_active', 'metadata',
    ];

    protected $casts = [
        'score' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    public function parameter(): BelongsTo
    {
        return $this->belongsTo(QualificationParameter::class, 'parameter_id');
    }
}
