<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Target;
use App\Models\TargetCascadeAllocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TargetController extends Controller
{
    /**
     * Get target cascades tree and metrics.
     */
    public function legacyIndex(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        if (! $tenant) {
            return response()->json([
                'company_target_revenue' => 0,
                'tree' => [],
            ]);
        }

        $companyTarget = (float) ($tenant->metadata['company_target_revenue'] ?? 0.0);
        $commissionSplits = $tenant->metadata['commission_splits'] ?? [
            'sales' => 100,
            'presales' => 100,
            'am' => 100,
            'csm' => 100,
        ];

        // Fetch all active users for the tenant
        $users = User::with('role')
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        // Infer direct_manager_id based on Role/Tier if not set
        $tierRanks = [
            'C-LEVEL' => 10,
            'VP' => 9,
            'DIRECTOR' => 8,
            'HEAD' => 7,
            'MANAGER' => 6,
            'SENIOR STAFF' => 5,
            'STAFF' => 4,
            'JR STAFF' => 3,
            'JR_AE' => 2,
        ];
        
        foreach ($users as $user) {
            if (is_null($user->direct_manager_id)) {
                $myRank = $tierRanks[$user->tier_level] ?? 1;
                // Only find a manager if they are not already a top-level leader (C-LEVEL)
                if ($myRank < 10) {
                    $potentialManager = $users->filter(function($u) use ($myRank, $tierRanks, $user) {
                        $theirRank = $tierRanks[$u->tier_level] ?? 1;
                        return $theirRank > $myRank && $u->id !== $user->id;
                    })->sortBy(function($u) use ($tierRanks) {
                        return $tierRanks[$u->tier_level] ?? 1; // Sort ascending to get the closest rank
                    })->first();
                    
                    if ($potentialManager) {
                        $user->direct_manager_id = $potentialManager->id;
                    }
                }
            }
        }

        // Prefetch metrics (Estimated & Realized Revenue) per user
        $userMetrics = [];
        $salesSplit = (float)($commissionSplits['sales'] ?? 100) / 100;
        $presalesSplit = (float)($commissionSplits['presales'] ?? 100) / 100;
        $amSplit = (float)($commissionSplits['am'] ?? 100) / 100;
        $csmSplit = (float)($commissionSplits['csm'] ?? 100) / 100;

        foreach ($users as $u) {
            $metrics = DB::table('leads')
                ->select(
                    DB::raw("SUM(estimated_closing_amount * (CASE WHEN owner_id = {$u->id} THEN {$salesSplit} ELSE 0 END + CASE WHEN presales_owner_id = {$u->id} THEN {$presalesSplit} ELSE 0 END + CASE WHEN am_owner_id = {$u->id} THEN {$amSplit} ELSE 0 END + CASE WHEN csm_owner_id = {$u->id} THEN {$csmSplit} ELSE 0 END)) as estimated"),
                    DB::raw("SUM(realized_closing_amount * (CASE WHEN owner_id = {$u->id} THEN {$salesSplit} ELSE 0 END + CASE WHEN presales_owner_id = {$u->id} THEN {$presalesSplit} ELSE 0 END + CASE WHEN am_owner_id = {$u->id} THEN {$amSplit} ELSE 0 END + CASE WHEN csm_owner_id = {$u->id} THEN {$csmSplit} ELSE 0 END)) as realized")
                )
                ->whereNull('deleted_at')
                ->where(function ($q) use ($u) {
                    $q->where('owner_id', $u->id)
                        ->orWhere('presales_owner_id', $u->id)
                        ->orWhere('am_owner_id', $u->id)
                        ->orWhere('csm_owner_id', $u->id);
                })
                ->first();

            $userMetrics[$u->id] = [
                'own_estimated_revenue' => (float) ($metrics->estimated ?? 0),
                'own_realized_revenue' => (float) ($metrics->realized ?? 0),
            ];
        }

        // Identify root users (direct manager is null or manager is not active/in the list)
        $activeIds = $users->pluck('id')->toArray();
        $rootUsers = $users->filter(function ($u) use ($activeIds) {
            return is_null($u->direct_manager_id) || ! in_array($u->direct_manager_id, $activeIds);
        });

        $tree = [];
        $usersArr = $users->toArray();

        $visited = [];

        foreach ($rootUsers as $root) {
            $visited[] = $root->id;
            $branch = $this->buildBranch($usersArr, $root->id, $userMetrics, (float) $root->target_revenue, $visited);

            $ownTarget = (float) $root->target_revenue;
            $ownEst = $userMetrics[$root->id]['own_estimated_revenue'];
            $ownReal = $userMetrics[$root->id]['own_realized_revenue'];

            $rollupTarget = $ownTarget + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_target_revenue'));
            $rollupEst = $ownEst + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_estimated_revenue'));
            $rollupReal = $ownReal + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_realized_revenue'));

            $tree[] = [
                'id' => $root->id,
                'name' => $root->name,
                'email' => $root->email,
                'role' => $root->role ? [
                    'name' => $root->role->name,
                    'display_name' => $root->role->display_name,
                ] : null,
                'tier_level' => $root->tier_level,
                'target_percentage' => (float) $root->target_percentage,
                'target_calculation_type' => $root->target_calculation_type,
                'metrics' => [
                    'own_target_revenue' => $ownTarget,
                    'own_estimated_revenue' => $ownEst,
                    'own_realized_revenue' => $ownReal,
                    'rollup_target_revenue' => $rollupTarget,
                    'rollup_estimated_revenue' => $rollupEst,
                    'rollup_realized_revenue' => $rollupReal,
                ],
                'reports' => $branch,
            ];
        }

        // Catch any remaining users (e.g. in a loop) and add them as root nodes
        foreach ($usersArr as $u) {
            if (!in_array($u['id'], $visited)) {
                $visited[] = $u['id'];
                $branch = $this->buildBranch($usersArr, $u['id'], $userMetrics, (float) $u['target_revenue'], $visited);

                $ownTarget = (float) $u['target_revenue'];
                $ownEst = $userMetrics[$u['id']]['own_estimated_revenue'] ?? 0.0;
                $ownReal = $userMetrics[$u['id']]['own_realized_revenue'] ?? 0.0;

                $rollupTarget = $ownTarget + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_target_revenue'));
                $rollupEst = $ownEst + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_estimated_revenue'));
                $rollupReal = $ownReal + array_sum(array_column(array_column($branch, 'metrics'), 'rollup_realized_revenue'));

                $tree[] = [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'email' => $u['email'],
                    'role' => $u['role'] ? [
                        'name' => $u['role']['name'],
                        'display_name' => $u['role']['display_name'],
                    ] : null,
                    'tier_level' => $u['tier_level'],
                    'target_percentage' => (float) $u['target_percentage'],
                    'target_calculation_type' => $u['target_calculation_type'],
                    'metrics' => [
                        'own_target_revenue' => $ownTarget,
                        'own_estimated_revenue' => $ownEst,
                        'own_realized_revenue' => $ownReal,
                        'rollup_target_revenue' => $rollupTarget,
                        'rollup_estimated_revenue' => $rollupEst,
                        'rollup_realized_revenue' => $rollupReal,
                    ],
                    'reports' => $branch,
                ];
            }
        }

        return response()->json([
            'company_target_revenue' => $companyTarget,
            'commission_splits' => $commissionSplits,
            'tree' => $tree,
        ]);
    }

    /**
     * Update target configs.
     */
    public function legacyUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'company_target_revenue' => 'nullable|numeric|min:0',
            'users' => 'nullable|array',
            'users.*.id' => 'required|exists:users,id',
            'users.*.target_calculation_type' => 'required|string|in:amount,percentage',
            'users.*.target_percentage' => 'required|numeric|min:0',
            'users.*.target_revenue' => 'nullable|numeric|min:0',
            'commission_splits' => 'nullable|array',
            'commission_splits.sales' => 'nullable|numeric|min:0',
            'commission_splits.presales' => 'nullable|numeric|min:0',
            'commission_splits.am' => 'nullable|numeric|min:0',
            'commission_splits.csm' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();
        $tenant = $user->tenant;

        if (! $tenant) {
            return response()->json(['error' => 'No active tenant workspace found'], 400);
        }

        // 1. Update Company Target
        $companyTarget = (float) ($tenant->metadata['company_target_revenue'] ?? 0.0);
        if ($request->has('company_target_revenue')) {
            $companyTarget = (float) $request->input('company_target_revenue');
            $metadata = $tenant->metadata ?? [];
            $metadata['company_target_revenue'] = $companyTarget;
            $tenant->metadata = $metadata;
            $tenant->save();

            // Cascade company-wide target change down the hierarchy
            User::cascadeCompanyTarget($companyTarget, $tenant->id);
        }
        
        if ($request->has('commission_splits')) {
            $metadata = $tenant->metadata ?? [];
            $metadata['commission_splits'] = $request->input('commission_splits');
            $tenant->metadata = $metadata;
            $tenant->save();
        }

        // 2. Update specific users in bulk (if provided)
        if ($request->has('users')) {
            $users = User::where('tenant_id', $tenant->id)->where('is_active', true)->get();
            $tierRanks = [
                'C-LEVEL' => 10, 'VP' => 9, 'DIRECTOR' => 8, 'HEAD' => 7,
                'MANAGER' => 6, 'SENIOR STAFF' => 5, 'STAFF' => 4, 'JR STAFF' => 3, 'JR_AE' => 2,
            ];
            
            foreach ($users as $user) {
                if (is_null($user->direct_manager_id)) {
                    $myRank = $tierRanks[$user->tier_level] ?? 1;
                    if ($myRank < 10) {
                        $potentialManager = $users->filter(function($u) use ($myRank, $tierRanks, $user) {
                            $theirRank = $tierRanks[$u->tier_level] ?? 1;
                            return $theirRank > $myRank && $u->id !== $user->id;
                        })->sortBy(function($u) use ($tierRanks) {
                            return $tierRanks[$u->tier_level] ?? 1;
                        })->first();
                        
                        if ($potentialManager) {
                            $user->direct_manager_id = $potentialManager->id;
                        }
                    }
                }
            }

            foreach ($request->input('users') as $uData) {
                // Find in the pre-fetched users collection to preserve the inferred direct_manager_id
                $targetUser = $users->firstWhere('id', $uData['id']);
                
                if ($targetUser) {
                    $targetUser->target_calculation_type = $uData['target_calculation_type'];
                    $targetUser->target_percentage = (float) $uData['target_percentage'];

                    if ($targetUser->target_calculation_type === 'amount') {
                        $targetUser->target_revenue = (float) ($uData['target_revenue'] ?? 0.0);
                    } else {
                        // Calculate percentage of manager's target or company target
                        if ($targetUser->direct_manager_id) {
                            // Find parent in the pre-fetched collection
                            $parent = $users->firstWhere('id', $targetUser->direct_manager_id);
                            $parentTarget = $parent ? (float) $parent->target_revenue : 0.0;
                            $targetUser->target_revenue = round(($parentTarget * $targetUser->target_percentage) / 100.0, 2);
                        } else {
                            $targetUser->target_revenue = round(($companyTarget * $targetUser->target_percentage) / 100.0, 2);
                        }
                    }
                    $targetUser->save();
                    
                    // Cascade targets down to direct reportees using inferred hierarchy
                    $this->cascadeInferredTargets($targetUser, $users);
                }
            }
        }

        return $this->legacyIndex($request);
    }

    private function cascadeInferredTargets(User $parent, $allUsers): void
    {
        $reports = $allUsers->where('direct_manager_id', $parent->id);
        foreach ($reports as $report) {
            if ($report->target_calculation_type === 'percentage') {
                $report->target_revenue = round(($parent->target_revenue * $report->target_percentage) / 100.0, 2);
                $report->save();
            }
            $this->cascadeInferredTargets($report, $allUsers);
        }
    }

    /**
     * Recursively build reports tree.
     */
    private function buildBranch(array &$users, int $managerId, array &$userMetrics, float $parentTarget, array &$visited = []): array
    {
        $branch = [];
        $children = array_filter($users, function ($u) use ($managerId, $visited) {
            return $u['direct_manager_id'] == $managerId && !in_array($u['id'], $visited) && $u['id'] != $managerId;
        });

        foreach ($children as $u) {
            $userId = $u['id'];
            $visited[] = $userId;
            $ownTarget = (float) $u['target_revenue'];
            $ownEst = $userMetrics[$userId]['own_estimated_revenue'] ?? 0.0;
            $ownReal = $userMetrics[$userId]['own_realized_revenue'] ?? 0.0;

            $subBranch = $this->buildBranch($users, $userId, $userMetrics, $ownTarget, $visited);

            $rollupTarget = $ownTarget + array_sum(array_column(array_column($subBranch, 'metrics'), 'rollup_target_revenue'));
            $rollupEst = $ownEst + array_sum(array_column(array_column($subBranch, 'metrics'), 'rollup_estimated_revenue'));
            $rollupReal = $ownReal + array_sum(array_column(array_column($subBranch, 'metrics'), 'rollup_realized_revenue'));

            $branch[] = [
                'id' => $u['id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'] ? [
                    'name' => $u['role']['name'],
                    'display_name' => $u['role']['display_name'],
                ] : null,
                'tier_level' => $u['tier_level'],
                'target_percentage' => (float) $u['target_percentage'],
                'target_calculation_type' => $u['target_calculation_type'],
                'metrics' => [
                    'own_target_revenue' => $ownTarget,
                    'own_estimated_revenue' => $ownEst,
                    'own_realized_revenue' => $ownReal,
                    'rollup_target_revenue' => $rollupTarget,
                    'rollup_estimated_revenue' => $rollupEst,
                    'rollup_realized_revenue' => $rollupReal,
                ],
                'reports' => $subBranch,
            ];
        }

        return $branch;
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $targets = Target::with(['assignedUser', 'directManager', 'parentTarget'])
            ->where('tenant_id', $tenant->id)
            ->get();

        return response()->json($targets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'target_name' => 'nullable|string|max:255',
            'role_type' => 'required|string',
            'target_type' => 'required|string',
            'assigned_user_id' => 'required|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'period_type' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'target_value_type' => 'required|string',
            'target_amount' => 'nullable|numeric|min:0',
            'target_quantity' => 'nullable|integer|min:0',
            'target_percentage' => 'nullable|numeric|min:0|max:100',
            'target_score' => 'nullable|numeric|min:0|max:100',
            'target_days' => 'nullable|integer|min:0',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'revenue_type' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $validated['tenant_id'] = $tenant->id;
        $validated['created_by'] = $request->user()->id;

        $target = Target::create($validated);
        return response()->json($target, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = Target::with(['assignedUser', 'directManager', 'parentTarget'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($id);

        return response()->json($target);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = Target::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'target_name' => 'nullable|string|max:255',
            'role_type' => 'required|string',
            'target_type' => 'required|string',
            'assigned_user_id' => 'required|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'period_type' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'target_value_type' => 'required|string',
            'target_amount' => 'nullable|numeric|min:0',
            'target_quantity' => 'nullable|integer|min:0',
            'target_percentage' => 'nullable|numeric|min:0|max:100',
            'target_score' => 'nullable|numeric|min:0|max:100',
            'target_days' => 'nullable|integer|min:0',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'revenue_type' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $target->update($validated);
        return response()->json($target);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = Target::where('tenant_id', $tenant->id)->findOrFail($id);
        $target->delete();
        
        return response()->json(['message' => 'Target deleted successfully']);
    }

    public function cascade(Request $request, $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $parentTarget = Target::where('tenant_id', $tenant->id)->findOrFail($id);

        if ($parentTarget->role_type !== 'sales' || !in_array($parentTarget->target_type, ['closed_won_revenue', 'new_business_revenue']) || $parentTarget->target_value_type !== 'amount') {
            return response()->json(['error' => 'Cascade is only allowed for Sales revenue targets.'], 403);
        }

        $validated = $request->validate([
            'child_target_id' => 'required|exists:targets,id',
            'allocated_amount' => 'required|numeric|min:0',
        ]);

        $childTarget = Target::where('tenant_id', $tenant->id)->findOrFail($validated['child_target_id']);
        
        // Basic validation: sum of child allocations shouldn't exceed parent target_amount
        $currentAllocations = TargetCascadeAllocation::where('parent_target_id', $parentTarget->id)->sum('allocated_amount');
        if (($currentAllocations + $validated['allocated_amount']) > $parentTarget->target_amount) {
            return response()->json(['error' => 'Allocated amount exceeds parent remaining amount.'], 422);
        }

        $allocation = TargetCascadeAllocation::create([
            'parent_target_id' => $parentTarget->id,
            'child_target_id' => $childTarget->id,
            'allocated_amount' => $validated['allocated_amount'],
            'allocation_percentage' => $parentTarget->target_amount > 0 ? ($validated['allocated_amount'] / $parentTarget->target_amount) * 100 : 0,
            'remaining_amount_snapshot' => $parentTarget->target_amount - ($currentAllocations + $validated['allocated_amount']),
            'created_by' => $request->user()->id,
        ]);

        return response()->json($allocation, 201);
    }

    public function achievement(Request $request, $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = Target::where('tenant_id', $tenant->id)->findOrFail($id);
        
        // Use TargetCalculationService to get actuals (implemented later)
        $actual = app(\App\Services\TargetCalculationService::class)->calculateActual($target);

        return response()->json([
            'target' => $target,
            'actual' => $actual['value'],
            'data_source' => $actual['source'],
            'is_available' => $actual['is_available'],
        ]);
    }
}
