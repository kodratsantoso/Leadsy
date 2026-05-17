<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    protected $fillable = ['code', 'name', 'symbol', 'minor_unit', 'is_active'];

    protected $casts = [
        'minor_unit' => 'integer',
        'is_active' => 'boolean',
    ];

    public function settings(): HasMany
    {
        return $this->hasMany(CurrencySetting::class);
    }
}
