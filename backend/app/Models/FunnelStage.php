<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property int $sequence
 * @property string $color
 * @property int $probability
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereColor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereProbability($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereSequence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|FunnelStage whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class FunnelStage extends Model
{
    protected $fillable = ['name', 'sequence', 'color', 'probability', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
        'probability' => 'integer',
        'sequence' => 'integer',
    ];
}
