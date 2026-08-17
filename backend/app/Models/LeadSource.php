<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $source_type
 * @property string|null $source_ref
 * @property string $confidence
 * @property \Illuminate\Support\Carbon|null $last_verified_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property int|null $channel_type_id
 * @property string|null $lark_app_token
 * @property string|null $lark_table_id
 * @property-read \App\Models\LeadChannelType|null $channelType
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereChannelTypeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereConfidence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereLarkAppToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereLarkTableId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereLastVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereSourceRef($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSource whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadSource extends Model
{
    protected $fillable = [
        'lead_id', 'source_type', 'channel_type_id', 'source_ref', 'confidence', 'last_verified_at',
        'lark_app_token', 'lark_table_id',
    ];

    protected $casts = ['last_verified_at' => 'date'];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function channelType(): BelongsTo
    {
        return $this->belongsTo(LeadChannelType::class, 'channel_type_id');
    }
}
