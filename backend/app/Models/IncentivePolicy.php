<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncentivePolicy extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'incentive_policies';

    protected $fillable = [
        'tenant_id',
        'policy_name',
        'is_active',
        'saas_pool_rate',
        'ps_pool_rate',
        'direct_allocation_percentage',
        'indirect_allocation_percentage',
        'shared_allocation_percentage',
        'revenue_trigger',
        'exclude_vat',
        'exclude_wht',
        'exclude_discount',
        'exclude_pass_through_cost',
        'hours_per_manday',
        'ps_effort_source',
        'sa_csm_effort_source',
        'allow_manager_effort_override',
        'milestone_effort_weights_json',
        'role_weights_json',
        'performance_multipliers_json',
        'exception_fallback_indirect',
        'joiner_leaver_policy',
        'exclude_probation',
        'payout_cycle',
        'privacy_mode',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'saas_pool_rate' => 'decimal:2',
        'ps_pool_rate' => 'decimal:2',
        'direct_allocation_percentage' => 'decimal:2',
        'indirect_allocation_percentage' => 'decimal:2',
        'shared_allocation_percentage' => 'decimal:2',
        'exclude_vat' => 'boolean',
        'exclude_wht' => 'boolean',
        'exclude_discount' => 'boolean',
        'exclude_pass_through_cost' => 'boolean',
        'hours_per_manday' => 'decimal:2',
        'allow_manager_effort_override' => 'boolean',
        'milestone_effort_weights_json' => 'array',
        'role_weights_json' => 'array',
        'performance_multipliers_json' => 'array',
        'exclude_probation' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function roleSettings(): HasMany
    {
        return $this->hasMany(RoleIncentiveSetting::class, 'policy_id');
    }

    public function pools(): HasMany
    {
        return $this->hasMany(IncentivePool::class, 'policy_id');
    }

    /**
     * Get or create the active policy for the tenant/default.
     */
    public static function getActivePolicy(?int $tenantId = null): self
    {
        $query = static::where('is_active', true);
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $policy = $query->first();

        if (! $policy) {
            $policy = static::create([
                'tenant_id' => $tenantId,
                'policy_name' => 'Kebijakan Insentif Departemen Standar',
                'is_active' => true,
                'saas_pool_rate' => 2.00,
                'ps_pool_rate' => 3.00,
                'direct_allocation_percentage' => 70.00,
                'indirect_allocation_percentage' => 20.00,
                'shared_allocation_percentage' => 10.00,
                'revenue_trigger' => 'cash_collection',
                'exclude_vat' => true,
                'exclude_wht' => false,
                'exclude_discount' => true,
                'exclude_pass_through_cost' => true,
                'hours_per_manday' => 8.00,
                'ps_effort_source' => 'ps_work_log',
                'sa_csm_effort_source' => 'milestone_defaults',
                'allow_manager_effort_override' => true,
                'milestone_effort_weights_json' => [
                    'solution_design' => 2.0,
                    'technical_demo' => 0.5,
                    'proof_of_concept' => 3.0,
                    'proposal_scope' => 1.0,
                    'csm_renewal' => 2.0,
                ],
                'role_weights_json' => [
                    'lead' => 1.50,
                    'core' => 1.20,
                    'supporting' => 1.00,
                    'minor' => 0.50,
                ],
                'performance_multipliers_json' => [
                    'below' => 0.80,
                    'meets' => 1.00,
                    'exceeds' => 1.10,
                    'outstanding' => 1.20,
                ],
                'exception_fallback_indirect' => 'redirect_to_direct',
                'joiner_leaver_policy' => 'prorata_calendar_days',
                'exclude_probation' => true,
                'payout_cycle' => 'monthly',
                'privacy_mode' => 'individual_only',
            ]);

            // Sync with existing roles in User & Role
            $policy->syncRoles();
        }

        return $policy;
    }

    /**
     * Synchronize and seed default role settings for any missing roles.
     */
    public function syncRoles(): void
    {
        $roles = Role::where('is_active', true)->get();

        foreach ($roles as $role) {
            $existing = $this->roleSettings()->where('role_id', $role->id)->first();
            if ($existing) {
                continue;
            }

            // Reasonable defaults based on role name
            $name = strtolower($role->name);
            $displayName = strtolower($role->display_name);

            $isEligible = true;
            $saasRate = 0.00;
            $psRate = 0.00;
            $allocationMode = 'collaborative_pool';
            $defaultLevel = 'core';

            if (str_contains($name, 'super_admin') || str_contains($name, 'admin') || str_contains($name, 'viewer')) {
                $isEligible = false;
            } elseif (str_contains($name, 'sales_exec') || str_contains($name, 'sales')) {
                $saasRate = 2.00;
                $psRate = 1.00;
                $allocationMode = 'direct_individual';
                $defaultLevel = 'lead';
            } elseif (str_contains($name, 'presales') || str_contains($displayName, 'architect') || str_contains($name, 'solution')) {
                $saasRate = 1.00;
                $psRate = 0.50;
                $allocationMode = 'collaborative_pool';
                $defaultLevel = 'core';
            } elseif (str_contains($name, 'csm') || str_contains($displayName, 'success')) {
                $saasRate = 1.00;
                $psRate = 0.00;
                $allocationMode = 'collaborative_pool';
                $defaultLevel = 'supporting';
            } elseif (str_contains($name, 'consultant') || str_contains($displayName, 'service') || str_contains($name, 'ps')) {
                $saasRate = 0.00;
                $psRate = 3.00;
                $allocationMode = 'collaborative_pool';
                $defaultLevel = 'core';
            }

            $this->roleSettings()->create([
                'tenant_id' => $this->tenant_id,
                'role_id' => $role->id,
                'is_eligible' => $isEligible,
                'saas_rate' => $saasRate,
                'ps_rate' => $psRate,
                'allocation_mode' => $allocationMode,
                'default_contributor_level' => $defaultLevel,
            ]);
        }
    }
}
