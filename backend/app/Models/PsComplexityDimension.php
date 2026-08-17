<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsComplexityDimension whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsComplexityDimension extends Model
{
    use HasFactory;

    protected $table = 'ps_complexity_dimensions';

    protected $fillable = [
        'name',
        'description',
    ];
}
