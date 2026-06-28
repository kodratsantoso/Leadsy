<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappConversation extends Model
{
    protected $fillable = [
        'contact_id',
        'external_chat_id',
        'sync_status',
        'relevance_status',
        'approved_for_sync',
        'last_message_at',
        'platform',
        'user_id',
        'assignee_id',
        'is_resolved',
        'notes',
        'tags',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'approved_for_sync' => 'boolean',
        'is_resolved' => 'boolean',
        'tags' => 'array',
    ];

    public function contact()
    {
        return $this->belongsTo(WhatsappContact::class, 'contact_id');
    }

    public function messages()
    {
        return $this->hasMany(WhatsappMessage::class, 'conversation_id');
    }

    public function aiAnalysis()
    {
        return $this->hasOne(WhatsappAiAnalysis::class, 'conversation_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
