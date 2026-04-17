<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
