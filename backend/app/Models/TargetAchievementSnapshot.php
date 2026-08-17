<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $target_type
 * @property int $target_id
 * @property numeric $actual_value
 * @property numeric $target_value
 * @property numeric $achievement_percentage
 * @property array<array-key, mixed>|null $calculation_basis_json
 * @property array<array-key, mixed>|null $data_sources_json
 * @property string|null $limitation
 * @property \Illuminate\Support\Carbon $generated_at
 * @property int $tenant_id
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereAchievementPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereActualValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereCalculationBasisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereDataSourcesJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereLimitation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereTargetId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereTargetType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereTargetValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|TargetAchievementSnapshot whereTenantId($value)
 * @mixin \Eloquent
 */
class TargetAchievementSnapshot extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'target_type',
        'target_id',
        'actual_value',
        'target_value',
        'achievement_percentage',
        'calculation_basis_json',
        'data_sources_json',
        'limitation',
        'generated_at',
        'tenant_id',
    ];

    protected $casts = [
        'calculation_basis_json' => 'array',
        'data_sources_json' => 'array',
        'generated_at' => 'datetime',
    ];
}
