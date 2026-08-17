<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $service_category_id
 * @property string $name
 * @property string|null $description
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsTemplateComponent> $components
 * @property-read int|null $components_count
 * @property-read \App\Models\PsServiceCategory $serviceCategory
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereServiceCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationTemplate whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsEstimationTemplate extends Model
{
    use HasFactory;

    protected $table = 'ps_estimation_templates';

    protected $fillable = [
        'service_category_id',
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

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(PsServiceCategory::class, 'service_category_id');
    }

    public function components(): HasMany
    {
        return $this->hasMany(PsTemplateComponent::class, 'template_id')->orderBy('sort_order');
    }
}
