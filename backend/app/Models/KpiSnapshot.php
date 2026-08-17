<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $kpi_key
 * @property numeric $actual_value
 * @property numeric|null $target_value
 * @property numeric|null $achievement_percentage
 * @property string $period_type
 * @property \Illuminate\Support\Carbon|null $period_start
 * @property \Illuminate\Support\Carbon|null $period_end
 * @property \Illuminate\Support\Carbon $generated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereAchievementPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereActualValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereKpiKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot wherePeriodEnd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot wherePeriodStart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot wherePeriodType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereTargetValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|KpiSnapshot whereUserId($value)
 * @mixin \Eloquent
 */
class KpiSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kpi_key',
        'actual_value',
        'target_value',
        'achievement_percentage',
        'period_type',
        'period_start',
        'period_end',
        'generated_at',
    ];

    protected $casts = [
        'actual_value' => 'decimal:2',
        'target_value' => 'decimal:2',
        'achievement_percentage' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
        'generated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
