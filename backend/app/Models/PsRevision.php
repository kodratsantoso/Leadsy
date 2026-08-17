<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $original_estimation_id
 * @property int $revised_estimation_id
 * @property int $revision_number
 * @property string|null $revision_reason
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\PsEstimation $originalEstimation
 * @property-read \App\Models\PsEstimation $revisedEstimation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereOriginalEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereRevisedEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereRevisionNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereRevisionReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsRevision whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsRevision extends Model
{
    use HasFactory;

    protected $table = 'ps_revisions';

    protected $fillable = [
        'original_estimation_id',
        'revised_estimation_id',
        'revision_number',
        'revision_reason',
        'created_by',
    ];

    public function originalEstimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class, 'original_estimation_id');
    }

    public function revisedEstimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class, 'revised_estimation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
