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
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsEstimationTemplate> $templates
 * @property-read int|null $templates_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsServiceCategory whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsServiceCategory extends Model
{
    use HasFactory;

    protected $table = 'ps_service_categories';

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

    public function templates(): HasMany
    {
        return $this->hasMany(PsEstimationTemplate::class, 'service_category_id');
    }
}
