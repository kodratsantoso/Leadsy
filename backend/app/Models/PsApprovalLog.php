<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
