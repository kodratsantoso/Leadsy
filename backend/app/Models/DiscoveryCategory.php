<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $label
 * @property string $value
 * @property int $sort_order
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|DiscoveryCategory whereValue($value)
 * @mixin \Eloquent
 */
class DiscoveryCategory extends Model
{
    protected $fillable = ['label', 'value', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
