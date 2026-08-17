<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property int $currency_id
 * @property string $thousands_separator
 * @property string $decimal_separator
 * @property int $decimal_digits
 * @property string $symbol_position
 * @property bool $space_between_symbol
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Currency $currency
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereCurrencyId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereDecimalDigits($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereDecimalSeparator($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereSpaceBetweenSymbol($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereSymbolPosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereThousandsSeparator($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CurrencySetting whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
