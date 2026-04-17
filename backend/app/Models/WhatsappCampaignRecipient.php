<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
