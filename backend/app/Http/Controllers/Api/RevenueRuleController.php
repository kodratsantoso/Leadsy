<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RevenueRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevenueRuleController extends Controller
{
    public function index(): JsonResponse
    {
        $rules = RevenueRule::orderBy('priority')->get();

        return response()->json(['data' => $rules]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'condition_type' => 'required|in:score_below,score_above,missing_field,industry_not_in,qualification_status,ghost_lead',
            'condition_value' => 'required|array',
            'action' => 'required|in:block,flag,prioritize,notify',
            'severity' => 'nullable|in:critical,warning,info',
            'is_active' => 'nullable|boolean',
            'priority' => 'nullable|integer|min:1',
        ]);

        $data['created_by'] = $request->user()->id;
        $data['tenant_id'] = $request->user()->tenant_id;
        $rule = RevenueRule::create($data);

        return response()->json(['data' => $rule], 201);
    }

    public function update(Request $request, RevenueRule $revenueRule): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'condition_type' => 'sometimes|in:score_below,score_above,missing_field,industry_not_in,qualification_status,ghost_lead',
            'condition_value' => 'sometimes|array',
            'action' => 'sometimes|in:block,flag,prioritize,notify',
            'severity' => 'nullable|in:critical,warning,info',
            'is_active' => 'nullable|boolean',
            'priority' => 'nullable|integer|min:1',
        ]);

        $revenueRule->update($data);

        return response()->json(['data' => $revenueRule->fresh()]);
    }

    public function destroy(RevenueRule $revenueRule): JsonResponse
    {
        $revenueRule->delete();

        return response()->json(['message' => 'Revenue rule deleted']);
    }
}
