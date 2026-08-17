<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $campaign_name
 * @property string $message_template
 * @property int $total_targets
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $executed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WhatsappCampaignRecipient> $recipients
 * @property-read int|null $recipients_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereCampaignName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereExecutedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereMessageTemplate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereTotalTargets($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaign whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class WhatsappCampaign extends Model
{
    protected $fillable = [
        'campaign_name',
        'message_template',
        'total_targets',
        'status',
        'executed_at',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public function recipients()
    {
        return $this->hasMany(WhatsappCampaignRecipient::class, 'campaign_id');
    }
}
