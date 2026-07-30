<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PsDocument extends Model
{
    protected $guarded = ['id'];
    
    protected $casts = [
        'generated_at' => 'datetime',
        'sent_for_signature_at' => 'datetime',
        'signed_at' => 'datetime',
    ];

    public function estimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class, 'estimation_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(LeadQuotation::class, 'quotation_id');
    }

    public function signers(): HasMany
    {
        return $this->hasMany(PsDocumentSigner::class, 'document_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function signatureEnvelope(): HasOne
    {
        return $this->hasOne(DigitalSignatureEnvelope::class, 'document_id');
    }
}
