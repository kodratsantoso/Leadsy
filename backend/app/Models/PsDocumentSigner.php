<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $document_id
 * @property string $signer_type
 * @property string $signer_name
 * @property string $signer_email
 * @property string|null $signer_title
 * @property string|null $signer_company
 * @property int $signing_order
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $signed_at
 * @property string|null $provider_signer_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsDocument $document
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereProviderSignerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignerCompany($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignerEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignerTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSignerType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereSigningOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsDocumentSigner whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsDocumentSigner extends Model
{
    protected $guarded = ['id'];
    
    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(PsDocument::class, 'document_id');
    }
}
