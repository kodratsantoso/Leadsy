<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MapCandidate extends Model
{
    protected $table = 'map_candidates';
    
    // We use place_id as the primary key
    protected $primaryKey = 'place_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'place_id',
        'name',
        'address',
        'phone',
        'website',
        'opening_hours_json',
        'lat',
        'lng',
        'category',
        'rating',
        'user_ratings_total',
        'maps_url',
        'raw_payload',
        'fetched_at',
        'last_enriched_at',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'rating' => 'float',
        'user_ratings_total' => 'integer',
        'opening_hours_json' => 'array',
        'raw_payload' => 'array',
        'fetched_at' => 'datetime',
        'last_enriched_at' => 'datetime',
    ];
}
