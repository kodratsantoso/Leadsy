<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $created_by
 * @property string $provider
 * @property string $provider_candidate_id
 * @property string|null $name
 * @property string|null $title
 * @property string|null $company_name
 * @property string|null $company_domain
 * @property bool $has_email
 * @property bool $has_phone
 * @property int $reveal_email_credits
 * @property int $reveal_phone_credits
 * @property string $status
 * @property array<array-key, mixed>|null $raw_preview
 * @property array<array-key, mixed>|null $raw_reveal
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $revealed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereCompanyDomain($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereCompanyName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereHasEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereHasPhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereProviderCandidateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereRawPreview($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereRawReveal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereRevealEmailCredits($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereRevealPhoneCredits($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereRevealedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactEnrichmentCandidate whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
