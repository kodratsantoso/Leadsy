<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
