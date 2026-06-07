<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappContact extends Model
{
    protected $fillable = [
        'name',
        'phone_number',
        'normalized_phone_number',
        'linked_lead_id',
        'is_relevant',
        'relevance_reason',
        'user_id',
    ];

    protected $casts = [
        'is_relevant' => 'boolean',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'linked_lead_id');
    }

    public function conversations()
    {
        return $this->hasMany(WhatsappConversation::class, 'contact_id');
    }
}
