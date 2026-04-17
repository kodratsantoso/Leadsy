<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
