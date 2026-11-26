<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoleIncentiveSetting extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'role_incentive_settings';

    protected $fillable = [
        'tenant_id',
        'policy_id',
        'role_id',
        'is_eligible',
        'saas_rate',
        'ps_rate',
        'allocation_mode',
        'default_contributor_level',
    ];

    protected $casts = [
        'is_eligible' => 'boolean',
        'saas_rate' => 'decimal:2',
        'ps_rate' => 'decimal:2',
    ];

    public function policy(): BelongsTo
    {
        return $this->belongsTo(IncentivePolicy::class, 'policy_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
