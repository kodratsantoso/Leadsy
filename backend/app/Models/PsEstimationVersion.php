<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
