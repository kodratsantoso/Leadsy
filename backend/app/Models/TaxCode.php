<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
 
/**
 * @property int $id
 * @property string $tax_code
 * @property string $tax_name
 * @property string $tax_type
 * @property numeric $rate_percentage
 * @property string|null $description
 * @property string|null $country
 * @property bool $is_default
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $effective_from
 * @property \Illuminate\Support\Carbon|null $effective_until
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $updater
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereCountry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereEffectiveUntil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereIsDefault($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereRatePercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereTaxCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereTaxName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereTaxType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TaxCode whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class TaxCode extends Model
{
    protected $fillable = [
        'tax_code',
        'tax_name',
        'tax_type',
        'rate_percentage',
        'description',
        'country',
        'is_default',
        'is_active',
        'effective_from',
        'effective_until',
        'created_by',
        'updated_by',
    ];
 
    protected $casts = [
        'rate_percentage' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_until' => 'date',
    ];
 
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
 
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
