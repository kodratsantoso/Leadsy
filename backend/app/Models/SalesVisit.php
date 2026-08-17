<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $user_id
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $clock_in_at
 * @property \Illuminate\Support\Carbon|null $clock_out_at
 * @property float|null $clock_in_lat
 * @property float|null $clock_in_lng
 * @property float|null $clock_out_lat
 * @property float|null $clock_out_lng
 * @property int|null $clock_in_accuracy_m
 * @property int|null $clock_out_accuracy_m
 * @property int|null $clock_in_distance_m
 * @property int|null $clock_out_distance_m
 * @property string $risk_status
 * @property array<array-key, mixed>|null $risk_signals
 * @property array<array-key, mixed>|null $device_metadata
 * @property string|null $visit_result
 * @property string|null $notes
 * @property string|null $client_name
 * @property string|null $client_title
 * @property \Illuminate\Support\Carbon|null $signature_captured_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SalesVisitMedia> $media
 * @property-read int|null $media_count
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClientName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClientTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockInAccuracyM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockInAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockInDistanceM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockInLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockInLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockOutAccuracyM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockOutAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockOutDistanceM($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockOutLat($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereClockOutLng($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereDeviceMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereRiskSignals($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereRiskStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereSignatureCapturedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesVisit whereVisitResult($value)
 * @mixin \Eloquent
 */
class SalesVisit extends Model
{
    protected $fillable = [
        'lead_id',
        'user_id',
        'status',
        'clock_in_at',
        'clock_out_at',
        'clock_in_lat',
        'clock_in_lng',
        'clock_out_lat',
        'clock_out_lng',
        'clock_in_accuracy_m',
        'clock_out_accuracy_m',
        'clock_in_distance_m',
        'clock_out_distance_m',
        'risk_status',
        'risk_signals',
        'device_metadata',
        'visit_result',
        'notes',
        'client_name',
        'client_title',
        'signature_captured_at',
    ];

    protected $casts = [
        'clock_in_at' => 'datetime',
        'clock_out_at' => 'datetime',
        'clock_in_lat' => 'float',
        'clock_in_lng' => 'float',
        'clock_out_lat' => 'float',
        'clock_out_lng' => 'float',
        'risk_signals' => 'array',
        'device_metadata' => 'array',
        'signature_captured_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(SalesVisitMedia::class);
    }
}
