<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $area_name
 * @property string|null $area_place_id
 * @property float|null $area_lat
 * @property float|null $area_lng
 * @property string|null $keyword
 * @property string|null $category
 * @property string $search_mode
 * @property int|null $radius_meters
 * @property int $result_count
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereAreaLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereAreaLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereAreaName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereAreaPlaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereKeyword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereRadiusMeters($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereResultCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereSearchMode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapSearchHistory whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class MapSearchHistory extends Model
{
    protected $table = 'map_search_history';

    protected $fillable = [
        'area_name',
        'area_place_id',
        'area_lat',
        'area_lng',
        'keyword',
        'category',
        'search_mode',
        'radius_meters',
        'result_count',
        'created_by',
    ];

    protected $casts = [
        'area_lat' => 'float',
        'area_lng' => 'float',
        'radius_meters' => 'integer',
        'result_count' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
