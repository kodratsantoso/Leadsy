<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactEnrichmentCandidate extends Model
{
    protected $fillable = [
        'lead_id',
        'created_by',
        'provider',
        'provider_candidate_id',
        'name',
        'title',
        'company_name',
        'company_domain',
        'has_email',
        'has_phone',
        'reveal_email_credits',
        'reveal_phone_credits',
        'status',
        'raw_preview',
        'raw_reveal',
        'expires_at',
        'revealed_at',
    ];

    protected $casts = [
        'has_email' => 'boolean',
        'has_phone' => 'boolean',
        'raw_preview' => 'array',
        'raw_reveal' => 'array',
        'expires_at' => 'datetime',
        'revealed_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
