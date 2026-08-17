<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $document_number
 * @property int $estimation_id
 * @property int|null $lead_id
 * @property int|null $quotation_id
 * @property string $document_type
 * @property string $document_title
 * @property int $version_number
 * @property string $status
 * @property string|null $template_key
 * @property string|null $template_version
 * @property string $file_name
 * @property string $file_path
 * @property string|null $file_url
 * @property string $file_mime_type
 * @property int|null $file_size
 * @property string $storage_disk
 * @property int|null $generated_by
 * @property \Illuminate\Support\Carbon|null $generated_at
 * @property \Illuminate\Support\Carbon|null $sent_for_signature_at
 * @property \Illuminate\Support\Carbon|null $signed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsEstimation $estimation
 * @property-read \App\Models\User|null $generatedBy
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\LeadQuotation|null $quotation
 * @property-read \App\Models\DigitalSignatureEnvelope|null $signatureEnvelope
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsDocumentSigner> $signers
 * @property-read int|null $signers_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereDocumentNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereDocumentTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereDocumentType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereFileMimeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereFileName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereFileSize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereFileUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereGeneratedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereSentForSignatureAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereSignedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereStorageDisk($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereTemplateKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereTemplateVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocument whereVersionNumber($value)
 * @mixin \Eloquent
 */
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
