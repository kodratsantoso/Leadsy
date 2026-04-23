<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualificationParameter extends Model
{
    protected $fillable = [
        'parameter_set_id', 'dimension', 'parameter_key', 'label',
        'input_type', 'max_points', 'sort_order', 'is_required',
        'hard_stop_operator', 'hard_stop_value', 'metadata',
    ];

    protected $casts = [
        'max_points' => 'integer',
        'sort_order' => 'integer',
        'is_required' => 'boolean',
        'hard_stop_value' => 'array',
        'metadata' => 'array',
    ];

    public function parameterSet(): BelongsTo
    {
        return $this->belongsTo(QualificationParameterSet::class, 'parameter_set_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(QualificationParameterOption::class, 'parameter_id')->orderBy('sort_order');
    }
}
