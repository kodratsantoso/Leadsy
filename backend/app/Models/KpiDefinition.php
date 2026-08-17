<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $role_slug
 * @property string $kpi_key
 * @property string $kpi_name
 * @property string|null $description
 * @property array<array-key, mixed>|null $formula_json
 * @property numeric $weight
 * @property string $format
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereFormat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereFormulaJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereKpiKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereKpiName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereRoleSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiDefinition whereWeight($value)
 * @mixin \Eloquent
 */
class KpiDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'role_slug',
        'kpi_key',
        'kpi_name',
        'description',
        'formula_json',
        'weight',
        'format',
        'is_active',
    ];

    protected $casts = [
        'formula_json' => 'array',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
