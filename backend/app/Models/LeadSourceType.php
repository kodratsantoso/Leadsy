<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $sort_order
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadChannelType> $channels
 * @property-read int|null $channels_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSourceType whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadSourceType extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function channels(): HasMany
    {
        return $this->hasMany(LeadChannelType::class);
    }
}
