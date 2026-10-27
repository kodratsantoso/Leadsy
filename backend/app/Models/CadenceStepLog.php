<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CadenceStepLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_cadence_enrollment_id',
        'sales_cadence_step_id',
        'lead_id',
        'channel',
        'status',
        'rendered_content',
        'execution_error',
        'executed_at',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(LeadCadenceEnrollment::class, 'lead_cadence_enrollment_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(SalesCadenceStep::class, 'sales_cadence_step_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
