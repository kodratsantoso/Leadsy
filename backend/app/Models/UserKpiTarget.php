<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $kpi_key
 * @property numeric $target_value
 * @property string $period_type
 * @property \Illuminate\Support\Carbon|null $period_start
 * @property \Illuminate\Support\Carbon|null $period_end
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereKpiKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget wherePeriodEnd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget wherePeriodStart($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget wherePeriodType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereTargetValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|UserKpiTarget whereUserId($value)
 * @mixin \Eloquent
 */
class UserKpiTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kpi_key',
        'target_value',
        'period_type',
        'period_start',
        'period_end',
    ];

    protected $casts = [
        'target_value' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
