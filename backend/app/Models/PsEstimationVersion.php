<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $estimation_id
 * @property int $version_number
 * @property string|null $version_label
 * @property string|null $change_reason
 * @property array<array-key, mixed> $snapshot_json
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\PsEstimation $estimation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereChangeReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereSnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereVersionLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationVersion whereVersionNumber($value)
 * @mixin \Eloquent
 */
class PsEstimationVersion extends Model
{
    use HasFactory;

    protected $table = 'ps_estimation_versions';

    protected $fillable = [
        'estimation_id',
        'version_number',
        'version_label',
        'change_reason',
        'snapshot_json',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_json' => 'array',
        ];
    }

    public function estimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
