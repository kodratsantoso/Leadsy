<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property numeric $multiplier
 * @property string|null $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereMultiplier($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityLevel whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsComplexityLevel extends Model
{
    use HasFactory;

    protected $table = 'ps_complexity_levels';

    protected $fillable = [
        'name',
        'multiplier',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'multiplier' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
