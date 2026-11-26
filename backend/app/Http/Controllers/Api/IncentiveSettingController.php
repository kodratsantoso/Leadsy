<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncentivePolicy;
use App\Models\Role;
use App\Models\RoleIncentiveSetting;
use App\Services\Incentives\IncentiveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class IncentiveSettingController extends Controller
{
    protected IncentiveCalculationService $calculationService;

    public function __construct(IncentiveCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * Get active policy and all active role configurations.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id;
        $policy = IncentivePolicy::getActivePolicy($tenantId);

        // Make sure all active roles are synced
        $policy->syncRoles();

        $roleSettings = RoleIncentiveSetting::with('role:id,name,display_name')
            ->where('policy_id', $policy->id)
            ->get();

        return response()->json([
            'data' => [
                'policy' => $policy,
                'role_settings' => $roleSettings,
            ]
        ]);
    }

    /**
     * Update policy parameters and role matrix.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id;
        $policy = IncentivePolicy::getActivePolicy($tenantId);

        $validated = $request->validate([
            'policy_name' => 'nullable|string|max:255',
            'saas_pool_rate' => 'required|numeric|min:0|max:100',
            'ps_pool_rate' => 'required|numeric|min:0|max:100',
            'direct_allocation_percentage' => 'required|numeric|min:0|max:100',
            'indirect_allocation_percentage' => 'required|numeric|min:0|max:100',
            'shared_allocation_percentage' => 'required|numeric|min:0|max:100',
            'revenue_trigger' => 'required|string|in:cash_collection,invoiced_dpp,sales_order_confirmed',
            'exclude_vat' => 'boolean',
            'exclude_wht' => 'boolean',
            'exclude_discount' => 'boolean',
            'exclude_pass_through_cost' => 'boolean',
            'hours_per_manday' => 'required|numeric|min:1|max:24',
            'ps_effort_source' => 'string|in:ps_work_log,timesheet,manual',
            'sa_csm_effort_source' => 'string|in:milestone_defaults,timesheet',
            'allow_manager_effort_override' => 'boolean',
            'milestone_effort_weights_json' => 'nullable|array',
            'role_weights_json' => 'nullable|array',
            'performance_multipliers_json' => 'nullable|array',
            'exception_fallback_indirect' => 'required|string|in:redirect_to_direct,redirect_to_shared,halt_review',
            'joiner_leaver_policy' => 'required|string|in:prorata_calendar_days,cutoff_date',
            'exclude_probation' => 'boolean',
            'payout_cycle' => 'required|string|in:monthly,quarterly,milestone',
            'privacy_mode' => 'required|string|in:individual_only,open_transparent',
            'role_settings' => 'nullable|array',
            'role_settings.*.role_id' => 'required|exists:roles,id',
            'role_settings.*.is_eligible' => 'required|boolean',
            'role_settings.*.saas_rate' => 'required|numeric|min:0|max:100',
            'role_settings.*.ps_rate' => 'required|numeric|min:0|max:100',
            'role_settings.*.allocation_mode' => 'required|string|in:collaborative_pool,direct_individual',
            'role_settings.*.default_contributor_level' => 'required|string|in:lead,core,supporting,minor',
        ]);

        // Validate that total allocation equals 100%
        $totalAllocation = round(
            $validated['direct_allocation_percentage'] +
            $validated['indirect_allocation_percentage'] +
            $validated['shared_allocation_percentage'],
            2
        );

        if ($totalAllocation !== 100.00) {
            return response()->json([
                'message' => 'Total pembagian alokasi pool harus tepat 100.00% (Saat ini: ' . $totalAllocation . '%).'
            ], 422);
        }

        DB::transaction(function () use ($policy, $validated, $request) {
            $policyData = collect($validated)->except('role_settings')->toArray();
            $policyData['updated_by'] = $request->user()?->id;
            $policy->update($policyData);

            // Update role settings
            if (!empty($validated['role_settings'])) {
                foreach ($validated['role_settings'] as $rsData) {
                    RoleIncentiveSetting::updateOrCreate(
                        [
                            'policy_id' => $policy->id,
                            'role_id' => $rsData['role_id'],
                        ],
                        [
                            'tenant_id' => $policy->tenant_id,
                            'is_eligible' => $rsData['is_eligible'],
                            'saas_rate' => $rsData['saas_rate'],
                            'ps_rate' => $rsData['ps_rate'],
                            'allocation_mode' => $rsData['allocation_mode'],
                            'default_contributor_level' => $rsData['default_contributor_level'],
                        ]
                    );
                }
            }
        });

        return response()->json([
            'message' => 'Pengaturan insentif kolaboratif berhasil disimpan.',
            'data' => [
                'policy' => $policy->fresh(),
                'role_settings' => $policy->roleSettings()->with('role:id,name,display_name')->get(),
            ]
        ]);
    }

    /**
     * Preview calculation engine in real-time.
     */
    public function previewCalculation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gross_revenue' => 'required|numeric|min:0',
            'revenue_stream' => 'required|string|in:saas,professional_service,hybrid',
            'pool_rate' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'pass_through_cost' => 'nullable|numeric|min:0',
            'includes_vat' => 'boolean',
            'direct_allocation_percentage' => 'nullable|numeric|min:0|max:100',
            'indirect_allocation_percentage' => 'nullable|numeric|min:0|max:100',
            'shared_allocation_percentage' => 'nullable|numeric|min:0|max:100',
            'contributors' => 'nullable|array',
            'contributors.*.user_name' => 'nullable|string',
            'contributors.*.role_title' => 'nullable|string',
            'contributors.*.contribution_type' => 'required|string|in:direct,indirect',
            'contributors.*.role_weight' => 'required|numeric|min:0.1',
            'contributors.*.effort_units' => 'required|numeric|min:0.1',
            'contributors.*.performance_multiplier' => 'required|numeric|min:0.1',
        ]);

        $policy = IncentivePolicy::getActivePolicy($request->user()?->tenant_id);
        $preview = $this->calculationService->previewCalculation($validated, $policy);

        return response()->json(['data' => $preview]);
    }
}
