<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_source_type_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $sort_order
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LeadSourceType $sourceType
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereLeadSourceTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadChannelType whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadChannelType extends Model
{
    protected $fillable = [
        'lead_source_type_id',
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

    public function sourceType(): BelongsTo
    {
        return $this->belongsTo(LeadSourceType::class, 'lead_source_type_id');
    }
}
