<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyVerification extends Model
{
    protected $fillable = [
        'lead_id',
        'legal_name_resolved',
        'legal_status',
        'legal_confidence',
        'entity_match_confidence',
        'operational_confidence',
        'verified_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(CompanyVerificationEvidence::class, 'verification_id');
    }
}
