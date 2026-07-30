<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
