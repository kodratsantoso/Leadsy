<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesCadence extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'target_audience',
        'trigger_type',
        'trigger_criteria',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'trigger_criteria' => 'array',
    ];

    public function steps(): HasMany
    {
        return $this->hasMany(SalesCadenceStep::class)->orderBy('step_number');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(LeadCadenceEnrollment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
