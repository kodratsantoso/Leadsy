<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadRoleAssignment;
use Illuminate\Http\Request;

class LeadRoleAssignmentController extends Controller
{
    public function index($id)
    {
        $lead = Lead::findOrFail($id);
        
        // Ensure user has access to this lead
        // $this->authorize('view', $lead);

        $assignments = $lead->roleAssignments()->with(['user:id,name,email', 'assignedBy:id,name'])->get();
        return response()->json(['data' => $assignments]);
    }

    public function store(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_type' => 'required|string|in:sales,presales,csm,account_manager',
            'contribution_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string'
        ]);

        $assignment = $lead->roleAssignments()->create([
            'user_id' => $validated['user_id'],
            'role_type' => $validated['role_type'],
            'contribution_percentage' => $validated['contribution_percentage'] ?? 100,
            'assignment_status' => 'active',
            'assigned_by' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['data' => $assignment->load('user:id,name,email')], 201);
    }

    public function update(Request $request, $id, $assignmentId)
    {
        $assignment = LeadRoleAssignment::where('lead_id', $id)->findOrFail($assignmentId);

        $validated = $request->validate([
            'contribution_percentage' => 'nullable|numeric|min:0|max:100',
            'assignment_status' => 'nullable|string|in:active,replaced,removed',
            'notes' => 'nullable|string'
        ]);

        if (isset($validated['assignment_status']) && $validated['assignment_status'] !== 'active' && $assignment->assignment_status === 'active') {
            $assignment->removed_at = now();
        }

        $assignment->update($validated);

        return response()->json(['data' => $assignment->load('user:id,name,email')]);
    }

    public function destroy($id, $assignmentId)
    {
        $assignment = LeadRoleAssignment::where('lead_id', $id)->findOrFail($assignmentId);
        
        $assignment->update([
            'assignment_status' => 'removed',
            'removed_at' => now(),
        ]);

        return response()->json(['message' => 'Role assignment removed']);
    }
}
