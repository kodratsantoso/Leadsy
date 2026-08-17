<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $estimation_id
 * @property int|null $version_number
 * @property string $action
 * @property string|null $from_status
 * @property string|null $to_status
 * @property int|null $actor_id
 * @property string|null $comment
 * @property string|null $reason
 * @property array<array-key, mixed>|null $blocker_override_json
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $actor
 * @property-read \App\Models\PsEstimation $estimation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereActorId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereBlockerOverrideJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereComment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereFromStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereToStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsApprovalLog whereVersionNumber($value)
 * @mixin \Eloquent
 */
class PsApprovalLog extends Model
{
    use HasFactory;

    protected $table = 'ps_approval_logs';

    protected $fillable = [
        'estimation_id',
        'version_number',
        'action',
        'from_status',
        'to_status',
        'actor_id',
        'comment',
        'reason',
        'blocker_override_json',
    ];

    protected function casts(): array
    {
        return [
            'blocker_override_json' => 'array',
        ];
    }

    public function estimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
