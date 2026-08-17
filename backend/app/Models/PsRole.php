<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsRateCard> $rateCards
 * @property-read int|null $rate_cards_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRole whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsRole extends Model
{
    use HasFactory;

    protected $table = 'ps_roles';

    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function rateCards(): HasMany
    {
        return $this->hasMany(PsRateCard::class, 'role_id');
    }

    public function currentRateCard()
    {
        return $this->rateCards()
            ->where('is_active', true)
            ->where('effective_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', now());
            })
            ->latest('effective_from')
            ->first();
    }
}
