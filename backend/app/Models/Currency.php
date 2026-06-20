<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    protected $fillable = ['code', 'name', 'symbol', 'minor_unit', 'is_active', 'exchange_rate', 'base_currency', 'exchange_rate_updated_at'];

    protected $casts = [
        'minor_unit' => 'integer',
        'is_active' => 'boolean',
        'exchange_rate' => 'decimal:4',
        'exchange_rate_updated_at' => 'datetime',
    ];

    public function settings(): HasMany
    {
        return $this->hasMany(CurrencySetting::class);
    }
}
