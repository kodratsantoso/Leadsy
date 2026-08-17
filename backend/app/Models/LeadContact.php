<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $name
 * @property string|null $title
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $linkedin_url
 * @property int|null $contact_source_id
 * @property string $confidence
 * @property \Illuminate\Support\Carbon|null $last_verified_at
 * @property bool $do_not_contact
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $is_primary
 * @property string $source
 * @property int $confidence_score
 * @property-read \App\Models\ContactSource|null $contactSource
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadContactPayload> $payloads
 * @property-read int|null $payloads_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereConfidence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereContactSourceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereDoNotContact($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereIsPrimary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereLastVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereLinkedinUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContact whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadContact extends Model
{
    protected $fillable = [
        'lead_id', 'name', 'title', 'email', 'phone',
        'linkedin_url', 'contact_source_id', 'confidence',
        'last_verified_at', 'do_not_contact',
        'is_primary', 'source', 'confidence_score',
    ];

    protected $casts = [
        'do_not_contact' => 'boolean',
        'last_verified_at' => 'date',
        'is_primary' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contactSource(): BelongsTo
    {
        return $this->belongsTo(ContactSource::class);
    }

    public function payloads()
    {
        return $this->hasMany(LeadContactPayload::class, 'contact_id');
    }
}
