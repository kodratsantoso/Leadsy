<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $parameter_set_id
 * @property string $dimension
 * @property string $parameter_key
 * @property string $label
 * @property string $input_type
 * @property int $max_points
 * @property int $sort_order
 * @property bool $is_required
 * @property string|null $hard_stop_operator
 * @property array<array-key, mixed>|null $hard_stop_value
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\QualificationParameterOption> $options
 * @property-read int|null $options_count
 * @property-read \App\Models\QualificationParameterSet|null $parameterSet
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereDimension($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereHardStopOperator($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereHardStopValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereInputType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereIsRequired($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereMaxPoints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereParameterKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereParameterSetId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameter whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class QualificationParameter extends Model
{
    protected $fillable = [
        'parameter_set_id', 'dimension', 'parameter_key', 'label',
        'input_type', 'max_points', 'sort_order', 'is_required',
        'hard_stop_operator', 'hard_stop_value', 'metadata',
    ];

    protected $casts = [
        'max_points' => 'integer',
        'sort_order' => 'integer',
        'is_required' => 'boolean',
        'hard_stop_value' => 'array',
        'metadata' => 'array',
    ];

    public function parameterSet(): BelongsTo
    {
        return $this->belongsTo(QualificationParameterSet::class, 'parameter_set_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(QualificationParameterOption::class, 'parameter_id')->orderBy('sort_order');
    }
}
