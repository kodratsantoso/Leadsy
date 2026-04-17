<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadContact extends Model
{
    protected $fillable = [
        'lead_id', 'name', 'title', 'email', 'phone',
        'linkedin_url', 'contact_source_id', 'confidence',
        'last_verified_at', 'do_not_contact',
        'is_primary', 'source', 'confidence_score'
    ];

    protected $casts = [
        'do_not_contact'   => 'boolean',
        'last_verified_at' => 'date',
        'is_primary'       => 'boolean',
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
