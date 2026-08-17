<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $role_id
 * @property numeric $rate_per_manday
 * @property \Illuminate\Support\Carbon $effective_from
 * @property \Illuminate\Support\Carbon|null $effective_to
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsRole $role
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereEffectiveFrom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereEffectiveTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereRatePerManday($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRateCard whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsRateCard extends Model
{
    use HasFactory;

    protected $table = 'ps_rate_cards';

    protected $fillable = [
        'role_id',
        'rate_per_manday',
        'effective_from',
        'effective_to',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate_per_manday' => 'decimal:2',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(PsRole::class, 'role_id');
    }
}
