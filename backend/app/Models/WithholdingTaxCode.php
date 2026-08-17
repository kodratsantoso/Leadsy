<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
 
/**
 * @property int $id
 * @property string $wht_code
 * @property string $wht_name
 * @property string $wht_type
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
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereCountry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereEffectiveUntil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereIsDefault($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereRatePercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereWhtCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereWhtName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WithholdingTaxCode whereWhtType($value)
 * @mixin \Eloquent
 */
class WithholdingTaxCode extends Model
{
    protected $fillable = [
        'wht_code',
        'wht_name',
        'wht_type',
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
