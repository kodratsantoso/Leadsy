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

        $assignments = $lead->roleAssignments()
            ->where('assignment_status', 'active')
            ->with(['user:id,name,email', 'assignedBy:id,name'])
            ->get();
        return response()->json(['data' => $assignments]);
    }

    public function store(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_type' => 'required|string|in:sales,presales,csm,account_manager',
            'notes' => 'nullable|string'
        ]);

        $assignment = $lead->roleAssignments()->create([
            'user_id' => $validated['user_id'],
            'role_type' => $validated['role_type'],
            'assignment_status' => 'active',
            'assigned_by' => auth()->id(),
            'notes' => $validated['notes'] ?? null,
        ]);

        $this->syncToLeadModel($lead, $validated['role_type'], $validated['user_id']);

        return response()->json(['data' => $assignment->load('user:id,name,email')], 201);
    }

    public function update(Request $request, $id, $assignmentId)
    {
        $assignment = LeadRoleAssignment::where('lead_id', $id)->findOrFail($assignmentId);

        $validated = $request->validate([
            'assignment_status' => 'nullable|string|in:active,replaced,removed',
            'notes' => 'nullable|string'
        ]);

        if (isset($validated['assignment_status']) && $validated['assignment_status'] !== 'active' && $assignment->assignment_status === 'active') {
            $assignment->removed_at = now();
            $this->syncToLeadModel(Lead::findOrFail($id), $assignment->role_type, null, $assignment->user_id);
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

        $this->syncToLeadModel(Lead::findOrFail($id), $assignment->role_type, null, $assignment->user_id);

        return response()->json(['message' => 'Role assignment removed']);
    }

    private function syncToLeadModel(Lead $lead, string $roleType, ?int $newUserId, ?int $expectedCurrentUserId = null): void
    {
        $roleMap = [
            'sales' => 'owner_id',
            'presales' => 'presales_owner_id',
            'account_manager' => 'am_owner_id',
            'csm' => 'csm_owner_id',
        ];

        if (isset($roleMap[$roleType])) {
            $field = $roleMap[$roleType];
            
            // If removing, only nullify if it's currently assigned to the user we are removing
            if ($newUserId === null && $expectedCurrentUserId !== null) {
                if ($lead->$field == $expectedCurrentUserId) {
                    // Use updateQuietly to prevent infinite loop or duplicate observer triggers
                    $lead->updateQuietly([$field => null]);
                }
            } else {
                // If adding, update if it's different
                if ($lead->$field != $newUserId) {
                    $lead->updateQuietly([$field => $newUserId]);
                }
            }
        }
    }
}
