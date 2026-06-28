<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TargetCascadeAllocation extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'allocation_percentage' => 'decimal:2',
        'remaining_amount_snapshot' => 'decimal:2',
    ];

    public function parentTarget(): BelongsTo
    {
        return $this->belongsTo(Target::class, 'parent_target_id');
    }

    public function childTarget(): BelongsTo
    {
        return $this->belongsTo(Target::class, 'child_target_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
