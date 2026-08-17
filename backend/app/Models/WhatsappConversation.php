<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $contact_id
 * @property string $external_chat_id
 * @property string $sync_status
 * @property string $relevance_status
 * @property bool $approved_for_sync
 * @property \Illuminate\Support\Carbon|null $last_message_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string $platform
 * @property int|null $user_id
 * @property int|null $assignee_id
 * @property bool $is_resolved
 * @property string|null $notes
 * @property array<array-key, mixed>|null $tags
 * @property-read \App\Models\WhatsappAiAnalysis|null $aiAnalysis
 * @property-read \App\Models\User|null $assignee
 * @property-read \App\Models\WhatsappContact $contact
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WhatsappMessage> $messages
 * @property-read int|null $messages_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereApprovedForSync($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereAssigneeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereContactId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereExternalChatId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereIsResolved($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereLastMessageAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation wherePlatform($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereRelevanceStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereSyncStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereTags($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappConversation whereUserId($value)
 * @mixin \Eloquent
 */
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
