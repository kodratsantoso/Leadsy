<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncentiveContributor extends Model
{
    use HasFactory;

    protected $table = 'incentive_contributors';

    protected $fillable = [
        'pool_id',
        'user_id',
        'role_id',
        'contribution_type',
        'contributor_level',
        'role_weight',
        'effort_units',
        'performance_rating',
        'performance_multiplier',
        'contribution_score',
        'allocated_amount',
        'evaluation_notes',
    ];

    protected $casts = [
        'role_weight' => 'decimal:2',
        'effort_units' => 'decimal:2',
        'performance_multiplier' => 'decimal:2',
        'contribution_score' => 'decimal:4',
        'allocated_amount' => 'decimal:2',
    ];

    public function pool(): BelongsTo
    {
        return $this->belongsTo(IncentivePool::class, 'pool_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
