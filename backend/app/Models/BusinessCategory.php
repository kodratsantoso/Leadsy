<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property array<array-key, mixed>|null $synonyms
 * @property string|null $scoring_hints
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $code
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereScoringHints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereSynonyms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|BusinessCategory whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class BusinessCategory extends Model
{
    protected $fillable = [
        'code',
        'name',
        'synonyms',
        'scoring_hints',
        'is_active',
    ];

    protected $casts = [
        'synonyms' => 'array',
        'is_active' => 'boolean',
    ];
}
