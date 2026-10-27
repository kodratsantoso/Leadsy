<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadCadenceEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'sales_cadence_id',
        'lead_id',
        'enrolled_by',
        'current_step_id',
        'current_step_number',
        'status',
        'next_execution_at',
        'enrolled_at',
        'completed_at',
    ];

    protected $casts = [
        'current_step_number' => 'integer',
        'next_execution_at' => 'datetime',
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function cadence(): BelongsTo
    {
        return $this->belongsTo(SalesCadence::class, 'sales_cadence_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function currentStep(): BelongsTo
    {
        return $this->belongsTo(SalesCadenceStep::class, 'current_step_id');
    }

    public function stepLogs(): HasMany
    {
        return $this->hasMany(CadenceStepLog::class);
    }

    public function enroller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }
}
