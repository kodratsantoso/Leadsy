<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $industry_id
 * @property string $name
 * @property array<array-key, mixed>|null $synonyms
 * @property string|null $scoring_hints
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Industry $industry
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereIndustryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereScoringHints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereSynonyms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SubIndustry whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class SubIndustry extends Model
{
    protected $fillable = ['industry_id', 'name', 'synonyms', 'scoring_hints', 'is_active'];

    protected $casts = [
        'synonyms' => 'array',
        'is_active' => 'boolean',
    ];

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }
}
