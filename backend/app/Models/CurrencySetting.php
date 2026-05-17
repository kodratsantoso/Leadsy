<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurrencySetting extends Model
{
    protected $fillable = [
        'tenant_id',
        'currency_id',
        'thousands_separator',
        'decimal_separator',
        'decimal_digits',
        'symbol_position',
        'space_between_symbol',
    ];

    protected $casts = [
        'decimal_digits' => 'integer',
        'space_between_symbol' => 'boolean',
    ];

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
