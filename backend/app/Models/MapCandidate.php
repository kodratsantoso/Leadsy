<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $place_id
 * @property string $name
 * @property string|null $address
 * @property string|null $phone
 * @property float|null $lat
 * @property float|null $lng
 * @property string|null $category
 * @property float|null $rating
 * @property string|null $maps_url
 * @property array<array-key, mixed>|null $raw_payload
 * @property \Illuminate\Support\Carbon $fetched_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $website
 * @property array<array-key, mixed>|null $opening_hours_json
 * @property int|null $user_ratings_total
 * @property \Illuminate\Support\Carbon|null $last_enriched_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereFetchedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereLastEnrichedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereMapsUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereOpeningHoursJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate wherePlaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereRating($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereRawPayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereUserRatingsTotal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MapCandidate whereWebsite($value)
 * @mixin \Eloquent
 */
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
