<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyVerificationEvidence extends Model
{
    protected $table = 'company_verification_evidence';

    protected $fillable = [
        'verification_id',
        'source_type',
        'source_name',
        'source_url',
        'evidence_type',
        'raw_value',
        'normalized_value',
        'confidence',
        'retrieved_at',
    ];

    protected $casts = [
        'retrieved_at' => 'datetime',
    ];

    public function verification(): BelongsTo
    {
        return $this->belongsTo(CompanyVerification::class, 'verification_id');
    }
}
