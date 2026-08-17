<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string|null $name
 * @property string $phone_number
 * @property string|null $normalized_phone_number
 * @property int|null $linked_lead_id
 * @property bool $is_relevant
 * @property string|null $relevance_reason
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $user_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WhatsappConversation> $conversations
 * @property-read int|null $conversations_count
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereIsRelevant($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereLinkedLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereNormalizedPhoneNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact wherePhoneNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereRelevanceReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappContact whereUserId($value)
 * @mixin \Eloquent
 */
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
