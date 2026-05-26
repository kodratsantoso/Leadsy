<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesVisitMedia extends Model
{
    protected $fillable = [
        'sales_visit_id',
        'uploaded_by',
        'media_type',
        'disk',
        'path',
        'mime_type',
        'size_bytes',
        'lat',
        'lng',
        'accuracy_m',
        'captured_at',
        'metadata',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'captured_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(SalesVisit::class, 'sales_visit_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
