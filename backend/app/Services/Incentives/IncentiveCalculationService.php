<?php

namespace App\Services\Incentives;

use App\Models\IncentivePolicy;
use App\Models\IncentivePool;
use App\Models\IncentiveContributor;
use App\Models\User;
use Illuminate\Support\Collection;
use Exception;

class IncentiveCalculationService
{
    /**
     * Compute eligible revenue based on policy rules (DPP, tax exclusions, discounts).
     */
    public function computeEligibleRevenue(float $grossAmount, IncentivePolicy $policy, array $options = []): float
    {
        $eligible = $grossAmount;

        // If policy excludes discounts and discount amount is passed
        if ($policy->exclude_discount && !empty($options['discount_amount'])) {
            $eligible -= (float) $options['discount_amount'];
        }

        // If policy excludes pass-through / third-party costs
        if ($policy->exclude_pass_through_cost && !empty($options['pass_through_cost'])) {
            $eligible -= (float) $options['pass_through_cost'];
        }

        // Exclude VAT (11% in Indonesia) if gross includes VAT
        if ($policy->exclude_vat && !empty($options['includes_vat']) && $options['includes_vat'] === true) {
            $vatRate = !empty($options['vat_rate']) ? (float) $options['vat_rate'] : 11.0;
            $eligible = $eligible / (1.0 + ($vatRate / 100.0));
        }

        return max(0.0, round($eligible, 2));
    }

    /**
     * Run full calculation on an IncentivePool instance.
     */
    public function calculatePool(IncentivePool $pool): IncentivePool
    {
        $policy = $pool->policy ?? IncentivePolicy::getActivePolicy($pool->tenant_id);

        $eligibleRevenue = (float) $pool->eligible_revenue;
        $poolRate = (float) $pool->pool_rate_applied;

        // Total Pool Amount
        $totalPoolAmount = round($eligibleRevenue * ($poolRate / 100.0), 2);
        $pool->total_pool_amount = $totalPoolAmount;

        // Percentage splits from policy
        $directPct = (float) $policy->direct_allocation_percentage;
        $indirectPct = (float) $policy->indirect_allocation_percentage;
        $sharedPct = (float) $policy->shared_allocation_percentage;

        $contributors = $pool->contributors()->get();

        $directContributors = $contributors->where('contribution_type', 'direct');
        $indirectContributors = $contributors->where('contribution_type', 'indirect');

        // Exception Handling: Zero Indirect Contributors
        if ($indirectContributors->isEmpty() && $indirectPct > 0) {
            if ($policy->exception_fallback_indirect === 'redirect_to_direct') {
                $directPct += $indirectPct;
                $indirectPct = 0;
            } elseif ($policy->exception_fallback_indirect === 'redirect_to_shared') {
                $sharedPct += $indirectPct;
                $indirectPct = 0;
            }
        }

        $directPoolAmount = round($totalPoolAmount * ($directPct / 100.0), 2);
        $indirectPoolAmount = round($totalPoolAmount * ($indirectPct / 100.0), 2);
        $sharedPoolAmount = round($totalPoolAmount * ($sharedPct / 100.0), 2);

        $pool->direct_pool_amount = $directPoolAmount;
        $pool->indirect_pool_amount = $indirectPoolAmount;
        $pool->shared_pool_amount = $sharedPoolAmount;

        // 1. Calculate Scores for Direct & Indirect Contributors
        foreach ($contributors as $contributor) {
            $score = round((float) $contributor->role_weight * (float) $contributor->effort_units * (float) $contributor->performance_multiplier, 4);
            $contributor->contribution_score = $score;
        }

        // 2. Allocate Direct Pool
        $totalDirectScore = $directContributors->sum('contribution_score');
        $directAllocatedSum = 0.0;

        if ($totalDirectScore > 0 && $directPoolAmount > 0) {
            foreach ($directContributors as $dc) {
                $allocated = round(($dc->contribution_score / $totalDirectScore) * $directPoolAmount, 2);
                $dc->allocated_amount = $allocated;
                $directAllocatedSum += $allocated;
                $dc->save();
            }

            // Penny reconciliation for Direct Pool
            $directDiff = round($directPoolAmount - $directAllocatedSum, 2);
            if (abs($directDiff) > 0.001 && $directContributors->isNotEmpty()) {
                $topDirect = $directContributors->sortByDesc('contribution_score')->first();
                $topDirect->allocated_amount += $directDiff;
                $topDirect->save();
            }
        }

        // 3. Allocate Indirect Pool
        $totalIndirectScore = $indirectContributors->sum('contribution_score');
        $indirectAllocatedSum = 0.0;

        if ($totalIndirectScore > 0 && $indirectPoolAmount > 0) {
            foreach ($indirectContributors as $ic) {
                $allocated = round(($ic->contribution_score / $totalIndirectScore) * $indirectPoolAmount, 2);
                $ic->allocated_amount = $allocated;
                $indirectAllocatedSum += $allocated;
                $ic->save();
            }

            // Penny reconciliation for Indirect Pool
            $indirectDiff = round($indirectPoolAmount - $indirectAllocatedSum, 2);
            if (abs($indirectDiff) > 0.001 && $indirectContributors->isNotEmpty()) {
                $topIndirect = $indirectContributors->sortByDesc('contribution_score')->first();
                $topIndirect->allocated_amount += $indirectDiff;
                $topIndirect->save();
            }
        }

        // 4. Allocate Shared Department Pool (Distributed across eligible roster members)
        $this->distributeSharedPool($pool, $sharedPoolAmount, $policy);

        // Snapshot JSON audit trace
        $pool->calculation_snapshot_json = [
            'calculated_at' => now()->toIso8601String(),
            'policy_name' => $policy->policy_name,
            'eligible_revenue' => $eligibleRevenue,
            'pool_rate' => $poolRate,
            'total_pool' => $totalPoolAmount,
            'splits' => [
                'direct_percentage' => $directPct,
                'direct_amount' => $directPoolAmount,
                'indirect_percentage' => $indirectPct,
                'indirect_amount' => $indirectPoolAmount,
                'shared_percentage' => $sharedPct,
                'shared_amount' => $sharedPoolAmount,
            ],
            'direct_scores_sum' => $totalDirectScore,
            'indirect_scores_sum' => $totalIndirectScore,
            'exception_applied' => $indirectContributors->isEmpty() ? $policy->exception_fallback_indirect : 'none',
        ];

        $pool->save();

        return $pool->fresh(['contributors.user', 'contributors.role', 'policy']);
    }

    /**
     * Distribute shared department pool across active eligible users.
     */
    protected function distributeSharedPool(IncentivePool $pool, float $sharedPoolAmount, IncentivePolicy $policy): void
    {
        if ($sharedPoolAmount <= 0) {
            return;
        }

        // Remove previous shared contributors to recalculate cleanly
        $pool->contributors()->where('contribution_type', 'shared')->delete();

        // Get eligible members
        $query = User::where('is_active', true);
        if ($pool->tenant_id) {
            $query->where('tenant_id', $pool->tenant_id);
        }

        // Exclude system viewers or inactive if desired
        $query->whereHas('role', function ($rq) {
            $rq->whereNotIn('name', ['viewer']);
        });

        $eligibleUsers = $query->get();
        $memberCount = $eligibleUsers->count();

        if ($memberCount === 0) {
            return;
        }

        $individualShared = round($sharedPoolAmount / $memberCount, 2);
        $allocatedSum = 0.0;

        foreach ($eligibleUsers as $user) {
            $contributor = $pool->contributors()->create([
                'user_id' => $user->id,
                'role_id' => $user->role_id,
                'contribution_type' => 'shared',
                'contributor_level' => 'supporting',
                'role_weight' => 1.00,
                'effort_units' => 1.00,
                'performance_rating' => 'meets',
                'performance_multiplier' => 1.00,
                'contribution_score' => 1.00,
                'allocated_amount' => $individualShared,
                'evaluation_notes' => 'Alokasi Porsi Rata Pool Bersama Departemen (10%)',
            ]);

            $allocatedSum += $individualShared;
        }

        // Penny reconciliation
        $diff = round($sharedPoolAmount - $allocatedSum, 2);
        if (abs($diff) > 0.001) {
            $firstShared = $pool->contributors()->where('contribution_type', 'shared')->first();
            if ($firstShared) {
                $firstShared->allocated_amount += $diff;
                $firstShared->save();
            }
        }
    }

    /**
     * Simulation preview for UI without persisting to database.
     */
    public function previewCalculation(array $payload, ?IncentivePolicy $policy = null): array
    {
        $policy = $policy ?? IncentivePolicy::getActivePolicy();

        $gross = (float) ($payload['gross_revenue'] ?? 0.0);
        $stream = $payload['revenue_stream'] ?? 'saas';
        $rate = (float) ($payload['pool_rate'] ?? ($stream === 'saas' ? $policy->saas_pool_rate : $policy->ps_pool_rate));

        $eligible = $this->computeEligibleRevenue($gross, $policy, [
            'discount_amount' => $payload['discount_amount'] ?? 0,
            'pass_through_cost' => $payload['pass_through_cost'] ?? 0,
            'includes_vat' => $payload['includes_vat'] ?? false,
        ]);

        $totalPool = round($eligible * ($rate / 100.0), 2);

        $directPct = (float) ($payload['direct_allocation_percentage'] ?? $policy->direct_allocation_percentage);
        $indirectPct = (float) ($payload['indirect_allocation_percentage'] ?? $policy->indirect_allocation_percentage);
        $sharedPct = (float) ($payload['shared_allocation_percentage'] ?? $policy->shared_allocation_percentage);

        $contributorsInput = $payload['contributors'] ?? [];
        $directInput = array_filter($contributorsInput, fn($c) => ($c['contribution_type'] ?? 'direct') === 'direct');
        $indirectInput = array_filter($contributorsInput, fn($c) => ($c['contribution_type'] ?? '') === 'indirect');

        if (empty($indirectInput) && $indirectPct > 0) {
            if ($policy->exception_fallback_indirect === 'redirect_to_direct') {
                $directPct += $indirectPct;
                $indirectPct = 0;
            } elseif ($policy->exception_fallback_indirect === 'redirect_to_shared') {
                $sharedPct += $indirectPct;
                $indirectPct = 0;
            }
        }

        $directPool = round($totalPool * ($directPct / 100.0), 2);
        $indirectPool = round($totalPool * ($indirectPct / 100.0), 2);
        $sharedPool = round($totalPool * ($sharedPct / 100.0), 2);

        // Calculate scores
        $simulatedContributors = [];
        $totalDirectScore = 0.0;
        $totalIndirectScore = 0.0;

        foreach ($contributorsInput as $idx => $c) {
            $weight = (float) ($c['role_weight'] ?? 1.0);
            $effort = (float) ($c['effort_units'] ?? 1.0);
            $multiplier = (float) ($c['performance_multiplier'] ?? 1.0);
            $score = round($weight * $effort * $multiplier, 4);

            $type = $c['contribution_type'] ?? 'direct';
            if ($type === 'direct') {
                $totalDirectScore += $score;
            } elseif ($type === 'indirect') {
                $totalIndirectScore += $score;
            }

            $simulatedContributors[] = [
                'user_name' => $c['user_name'] ?? "User " . ($idx + 1),
                'role_title' => $c['role_title'] ?? "Contributor",
                'contribution_type' => $type,
                'role_weight' => $weight,
                'effort_units' => $effort,
                'performance_multiplier' => $multiplier,
                'contribution_score' => $score,
                'allocated_amount' => 0.0,
            ];
        }

        // Allocate
        foreach ($simulatedContributors as &$sc) {
            if ($sc['contribution_type'] === 'direct' && $totalDirectScore > 0) {
                $sc['allocated_amount'] = round(($sc['contribution_score'] / $totalDirectScore) * $directPool, 2);
            } elseif ($sc['contribution_type'] === 'indirect' && $totalIndirectScore > 0) {
                $sc['allocated_amount'] = round(($sc['contribution_score'] / $totalIndirectScore) * $indirectPool, 2);
            }
        }

        return [
            'eligible_revenue' => $eligible,
            'pool_rate' => $rate,
            'total_pool' => $totalPool,
            'direct_pool' => $directPool,
            'indirect_pool' => $indirectPool,
            'shared_pool' => $sharedPool,
            'contributors' => $simulatedContributors,
            'shared_pool_per_member_est' => round($sharedPool / max(1, count($simulatedContributors)), 2),
        ];
    }
}
