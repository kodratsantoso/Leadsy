<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property array<array-key, mixed>|null $synonyms
 * @property string|null $scoring_hints
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SubIndustry> $subIndustries
 * @property-read int|null $sub_industries_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereScoringHints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereSynonyms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Industry whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
