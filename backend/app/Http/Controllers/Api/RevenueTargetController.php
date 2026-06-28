<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RevenueTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RevenueTargetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $targets = RevenueTarget::with(['assignedUser', 'directManager', 'parentTarget'])
            ->where('tenant_id', $tenant->id)
            ->get();

        return response()->json($targets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'target_name' => 'nullable|string|max:255',
            'owner_type' => 'required|string|in:company,department,manager,user',
            'role_type' => 'nullable|string|in:sales,account_manager',
            'assigned_user_id' => 'nullable|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'revenue_target_type' => 'required|string',
            'period_type' => 'required|string|in:yearly,quarterly,monthly',
            'year' => 'required|integer',
            'quarter' => 'nullable|integer|min:1|max:4',
            'month' => 'nullable|integer|min:1|max:12',
            'currency_code' => 'nullable|string|size:3',
            'currency_symbol' => 'nullable|string',
            'target_amount' => 'required|numeric|min:0',
            'allocation_method' => 'nullable|string|in:amount,percentage',
            'parent_target_id' => 'nullable|exists:revenue_targets,id',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['tenant_id'] = $tenant->id;
        $validated['created_by'] = $request->user()->id;
        $validated['currency_code'] = $validated['currency_code'] ?? 'IDR';
        $validated['currency_symbol'] = $validated['currency_symbol'] ?? 'Rp';
        $validated['status'] = $validated['status'] ?? 'active';

        $target = RevenueTarget::create($validated);
        return response()->json($target, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = RevenueTarget::with(['assignedUser', 'directManager', 'parentTarget'])
            ->where('tenant_id', $tenant->id)
            ->findOrFail($id);

        return response()->json($target);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = RevenueTarget::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'target_name' => 'nullable|string|max:255',
            'owner_type' => 'nullable|string|in:company,department,manager,user',
            'role_type' => 'nullable|string|in:sales,account_manager',
            'assigned_user_id' => 'nullable|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'revenue_target_type' => 'nullable|string',
            'period_type' => 'nullable|string|in:yearly,quarterly,monthly',
            'year' => 'nullable|integer',
            'quarter' => 'nullable|integer|min:1|max:4',
            'month' => 'nullable|integer|min:1|max:12',
            'currency_code' => 'nullable|string|size:3',
            'currency_symbol' => 'nullable|string',
            'target_amount' => 'nullable|numeric|min:0',
            'allocation_method' => 'nullable|string|in:amount,percentage',
            'parent_target_id' => 'nullable|exists:revenue_targets,id',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $target->update($validated);
        return response()->json($target);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = RevenueTarget::where('tenant_id', $tenant->id)->findOrFail($id);
        $target->delete();
        
        return response()->json(['message' => 'Revenue Target deleted successfully']);
    }

    public function cascade(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $parentTarget = RevenueTarget::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'child_targets' => 'required|array',
            'child_targets.*.assigned_user_id' => 'required|exists:users,id',
            'child_targets.*.allocation_method' => 'required|string|in:amount,percentage',
            'child_targets.*.allocated_amount' => 'nullable|numeric|min:0',
            'child_targets.*.allocation_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        DB::beginTransaction();
        try {
            // Re-allocate children
            $totalAllocated = 0;
            $createdTargets = [];

            foreach ($validated['child_targets'] as $childData) {
                $amount = 0;
                if ($childData['allocation_method'] === 'percentage') {
                    $amount = ($parentTarget->target_amount * $childData['allocation_percentage']) / 100.0;
                } else {
                    $amount = $childData['allocated_amount'];
                }

                $totalAllocated += $amount;

                // Create or update child target
                $child = RevenueTarget::updateOrCreate(
                    [
                        'parent_target_id' => $parentTarget->id,
                        'assigned_user_id' => $childData['assigned_user_id'],
                        'tenant_id' => $tenant->id,
                    ],
                    [
                        'target_name' => 'Cascaded from ' . ($parentTarget->target_name ?? 'Parent'),
                        'owner_type' => 'user',
                        'role_type' => $parentTarget->role_type,
                        'direct_manager_id' => $parentTarget->assigned_user_id,
                        'revenue_target_type' => $parentTarget->revenue_target_type,
                        'period_type' => $parentTarget->period_type,
                        'year' => $parentTarget->year,
                        'quarter' => $parentTarget->quarter,
                        'month' => $parentTarget->month,
                        'currency_code' => $parentTarget->currency_code,
                        'currency_symbol' => $parentTarget->currency_symbol,
                        'target_amount' => $amount,
                        'allocation_method' => $childData['allocation_method'],
                        'allocated_amount' => $amount,
                        'allocation_percentage' => $childData['allocation_percentage'] ?? ($parentTarget->target_amount > 0 ? ($amount / $parentTarget->target_amount * 100) : 0),
                        'product_id' => $parentTarget->product_id,
                        'industry_id' => $parentTarget->industry_id,
                        'business_category_id' => $parentTarget->business_category_id,
                        'status' => 'active',
                        'created_by' => $request->user()->id,
                    ]
                );
                
                $createdTargets[] = $child;
            }

            if ($totalAllocated > $parentTarget->target_amount) {
                DB::rollBack();
                return response()->json(['error' => 'Total allocated amount exceeds parent target amount.'], 422);
            }

            // Update parent remaining amount snapshot
            $parentTarget->update([
                'remaining_amount_snapshot' => $parentTarget->target_amount - $totalAllocated
            ]);

            DB::commit();

            return response()->json([
                'parent' => $parentTarget,
                'children' => $createdTargets
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to cascade targets.', 'message' => $e->getMessage()], 500);
        }
    }
}
