<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsGovernanceRule;
use Illuminate\Http\Request;

class PsGovernanceRuleController extends Controller
{
    public function index()
    {
        $rules = PsGovernanceRule::with('serviceCategory:id,name')->get();
        
        return response()->json([
            'success' => true,
            'data' => $rules,
            'message' => 'Governance rules retrieved',
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rule_name' => 'required|string',
            'rule_type' => 'required|string',
            'threshold_value' => 'nullable|numeric',
            'applies_to_service_category_id' => 'nullable|exists:ps_service_categories,id',
            'approver_role_id' => 'nullable|exists:roles,id',
            'is_active' => 'boolean',
        ]);

        $validated['created_by'] = $request->user()->id;

        $rule = PsGovernanceRule::create($validated);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Governance rule created',
        ]);
    }

    public function update(Request $request, $id)
    {
        $rule = PsGovernanceRule::findOrFail($id);
        
        $validated = $request->validate([
            'rule_name' => 'string',
            'rule_type' => 'string',
            'threshold_value' => 'nullable|numeric',
            'applies_to_service_category_id' => 'nullable|exists:ps_service_categories,id',
            'approver_role_id' => 'nullable|exists:roles,id',
            'is_active' => 'boolean',
        ]);

        $validated['updated_by'] = $request->user()->id;

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Governance rule updated',
        ]);
    }
}
