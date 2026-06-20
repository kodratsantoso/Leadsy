<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TargetController extends Controller
{
    /**
     * Get target cascades tree and metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;

        if (! $tenant) {
            return response()->json([
                'company_target_revenue' => 0,
                'tree' => [],
            ]);
        }

        $companyTarget = (float) ($tenant->metadata['company_target_revenue'] ?? 0.0);

        // Fetch all active users for the tenant
        $users = User::with('role')
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        // Prefetch metrics (Estimated & Realized Revenue) per user
        $userMetrics = [];
        foreach ($users as $u) {
            $metrics = DB::table('leads')
                ->select(
                    DB::raw('SUM(estimated_closing_amount) as estimated'),
                    DB::raw('SUM(realized_closing_amount) as realized')
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

        foreach ($rootUsers as $root) {
            $branch = $this->buildBranch($usersArr, $root->id, $userMetrics, (float) $root->target_revenue);

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

        return response()->json([
            'company_target_revenue' => $companyTarget,
            'tree' => $tree,
        ]);
    }

    /**
     * Update target configs.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'company_target_revenue' => 'nullable|numeric|min:0',
            'users' => 'nullable|array',
            'users.*.id' => 'required|exists:users,id',
            'users.*.target_calculation_type' => 'required|string|in:amount,percentage',
            'users.*.target_percentage' => 'required|numeric|min:0',
            'users.*.target_revenue' => 'nullable|numeric|min:0',
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

        // 2. Update specific users in bulk (if provided)
        if ($request->has('users')) {
            foreach ($request->input('users') as $uData) {
                $targetUser = User::where('tenant_id', $tenant->id)->find($uData['id']);
                if ($targetUser) {
                    $targetUser->target_calculation_type = $uData['target_calculation_type'];
                    $targetUser->target_percentage = (float) $uData['target_percentage'];

                    if ($targetUser->target_calculation_type === 'amount') {
                        $targetUser->target_revenue = (float) ($uData['target_revenue'] ?? 0.0);
                    } else {
                        // Calculate percentage of manager's target or company target
                        if ($targetUser->direct_manager_id) {
                            $parent = User::find($targetUser->direct_manager_id);
                            $parentTarget = $parent ? (float) $parent->target_revenue : 0.0;
                            $targetUser->target_revenue = round(($parentTarget * $targetUser->target_percentage) / 100.0, 2);
                        } else {
                            $targetUser->target_revenue = round(($companyTarget * $targetUser->target_percentage) / 100.0, 2);
                        }
                    }
                    $targetUser->save();

                    // Cascade targets down to direct reportees
                    User::cascadeTargets($targetUser);
                }
            }
        }

        return $this->index($request);
    }

    /**
     * Recursively build reports tree.
     */
    private function buildBranch(array &$users, int $managerId, array &$userMetrics, float $parentTarget): array
    {
        $branch = [];
        $children = array_filter($users, function ($u) use ($managerId) {
            return $u['direct_manager_id'] === $managerId;
        });

        foreach ($children as $u) {
            $userId = $u['id'];
            $ownTarget = (float) $u['target_revenue'];
            $ownEst = $userMetrics[$userId]['own_estimated_revenue'] ?? 0.0;
            $ownReal = $userMetrics[$userId]['own_realized_revenue'] ?? 0.0;

            $subBranch = $this->buildBranch($users, $userId, $userMetrics, $ownTarget);

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
}
