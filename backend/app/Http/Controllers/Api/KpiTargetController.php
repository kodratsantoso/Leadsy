<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KpiTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiTargetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $targets = KpiTarget::with(['assignedUser', 'directManager'])
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
            'role_type' => 'required|string|in:sales,presales,csm,account_manager',
            'assigned_user_id' => 'required|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'kpi_type' => 'required|string',
            'period_type' => 'required|string|in:weekly,monthly,quarterly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'target_value_type' => 'required|string|in:quantity,percentage,score,days,hours',
            'target_quantity' => 'nullable|integer|min:0',
            'target_percentage' => 'nullable|numeric|min:0|max:100',
            'target_score' => 'nullable|numeric|min:0',
            'target_days' => 'nullable|integer|min:0',
            'target_hours' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'weight' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['tenant_id'] = $tenant->id;
        $validated['created_by'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['weight'] = $validated['weight'] ?? 100;

        $target = KpiTarget::create($validated);
        return response()->json($target, 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = KpiTarget::with(['assignedUser', 'directManager'])
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

        $target = KpiTarget::where('tenant_id', $tenant->id)->findOrFail($id);

        $validated = $request->validate([
            'target_name' => 'nullable|string|max:255',
            'role_type' => 'nullable|string|in:sales,presales,csm,account_manager',
            'assigned_user_id' => 'nullable|exists:users,id',
            'direct_manager_id' => 'nullable|exists:users,id',
            'kpi_type' => 'nullable|string',
            'period_type' => 'nullable|string|in:weekly,monthly,quarterly,yearly',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'target_value_type' => 'nullable|string|in:quantity,percentage,score,days,hours',
            'target_quantity' => 'nullable|integer|min:0',
            'target_percentage' => 'nullable|numeric|min:0|max:100',
            'target_score' => 'nullable|numeric|min:0',
            'target_days' => 'nullable|integer|min:0',
            'target_hours' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|exists:products,id',
            'industry_id' => 'nullable|exists:industries,id',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'weight' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $target->update($validated);
        return response()->json($target);
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $tenant = $request->request->user()?->tenant;
        if (!$tenant) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $target = KpiTarget::where('tenant_id', $tenant->id)->findOrFail($id);
        $target->delete();
        
        return response()->json(['message' => 'KPI Target deleted successfully']);
    }
}
