<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Industry extends Model
{
    protected $fillable = ['name', 'synonyms', 'scoring_hints', 'is_active'];

    protected $casts = [
        'synonyms' => 'array',
        'is_active' => 'boolean',
    ];

    public function subIndustries(): HasMany
    {
        return $this->hasMany(SubIndustry::class);
    }
}
