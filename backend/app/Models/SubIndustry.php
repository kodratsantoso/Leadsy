<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubIndustry extends Model
{
    protected $fillable = ['industry_id', 'name', 'synonyms', 'scoring_hints', 'is_active'];

    protected $casts = [
        'synonyms'  => 'array',
        'is_active' => 'boolean',
    ];

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }
}
