<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $parameter_id
 * @property string $option_value
 * @property string $label
 * @property int $score
 * @property int $sort_order
 * @property bool $is_active
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\QualificationParameter $parameter
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereOptionValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereParameterId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationParameterOption whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class QualificationParameterOption extends Model
{
    protected $fillable = [
        'parameter_id', 'option_value', 'label', 'score',
        'sort_order', 'is_active', 'metadata',
    ];

    protected $casts = [
        'score' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    public function parameter(): BelongsTo
    {
        return $this->belongsTo(QualificationParameter::class, 'parameter_id');
    }
}
