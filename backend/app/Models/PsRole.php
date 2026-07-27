<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
