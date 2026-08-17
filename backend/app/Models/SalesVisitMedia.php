<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $sales_visit_id
 * @property int|null $uploaded_by
 * @property string $media_type
 * @property string $disk
 * @property string $path
 * @property string|null $mime_type
 * @property int|null $size_bytes
 * @property float|null $lat
 * @property float|null $lng
 * @property int|null $accuracy_m
 * @property \Illuminate\Support\Carbon|null $captured_at
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $uploader
 * @property-read \App\Models\SalesVisit $visit
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereAccuracyM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereCapturedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereDisk($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereMediaType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereMimeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia wherePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereSalesVisitId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereSizeBytes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisitMedia whereUploadedBy($value)
 * @mixin \Eloquent
 */
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
