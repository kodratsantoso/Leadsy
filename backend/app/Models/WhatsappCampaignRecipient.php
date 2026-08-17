<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $campaign_id
 * @property int|null $lead_id
 * @property string $phone_number
 * @property string $send_status
 * @property array<array-key, mixed>|null $provider_response_json
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\WhatsappCampaign $campaign
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereCampaignId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient wherePhoneNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereProviderResponseJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereSendStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappCampaignRecipient whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class WhatsappCampaignRecipient extends Model
{
    protected $fillable = [
        'campaign_id',
        'lead_id',
        'phone_number',
        'send_status',
        'provider_response_json',
        'sent_at',
    ];

    protected $casts = [
        'provider_response_json' => 'array',
        'sent_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(WhatsappCampaign::class, 'campaign_id');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }
}
