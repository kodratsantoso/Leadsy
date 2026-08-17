<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $contact_id
 * @property string $source_type
 * @property array<array-key, mixed>|null $raw_payload
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LeadContact $contact
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereContactId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereRawPayload($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadContactPayload whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadContactPayload extends Model
{
    protected $fillable = [
        'contact_id',
        'source_type',
        'raw_payload',
    ];

    protected $casts = [
        'raw_payload' => 'array',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(LeadContact::class, 'contact_id');
    }
}
