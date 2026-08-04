<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkflowDefinition;
use App\Models\WorkflowVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WorkflowDefinitionController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = Auth::user()->tenant_id;
        $workflows = WorkflowDefinition::where('tenant_id', $tenantId)
            ->with(['creator', 'updater'])
            ->get();
            
        return response()->json(['data' => $workflows]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'base_record_type' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $tenantId = Auth::user()->tenant_id;

        $workflow = tap(new WorkflowDefinition([
            'tenant_id' => $tenantId,
            'name' => $request->name,
            'base_record_type' => $request->base_record_type,
            'category' => $request->category ?? 'Approval',
            'status' => 'draft',
            'description' => $request->description,
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]))->save();

        // Create an initial version
        $workflow->versions()->create([
            'version_number' => 1,
            'is_active' => false,
            'is_testing' => false,
            'created_by' => Auth::id(),
        ]);

        return response()->json(['data' => $workflow->load('versions')], 201);
    }

    public function show($id)
    {
        $tenantId = Auth::user()->tenant_id;
        $workflow = WorkflowDefinition::where('tenant_id', $tenantId)
            ->with(['versions.states.actions', 'versions.transitions.actions'])
            ->findOrFail($id);

        return response()->json(['data' => $workflow]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $tenantId = Auth::user()->tenant_id;
        $workflow = WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($id);

        $workflow->update([
            'name' => $request->name ?? $workflow->name,
            'description' => $request->description ?? $workflow->description,
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['data' => $workflow]);
    }

    public function destroy($id)
    {
        $tenantId = Auth::user()->tenant_id;
        $workflow = WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($id);
        
        $workflow->delete();
        
        return response()->json(['message' => 'Workflow archived successfully']);
    }

    public function syncGraph(Request $request, $id)
    {
        $tenantId = Auth::user()->tenant_id;
        $workflow = WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'nodes' => 'required|array',
            'edges' => 'required|array',
        ]);

        $version = $workflow->versions()->latest()->first();
        if (!$version) {
            return response()->json(['message' => 'No active version found to sync'], 404);
        }

        $frontendNodes = collect($request->nodes);
        $frontendEdges = collect($request->edges);

        // Keep track of mapped IDs (Frontend ReactFlow ID => DB ID)
        $idMap = [];

        // 1. Process Nodes (States)
        $processedStateIds = [];
        foreach ($frontendNodes as $nodeData) {
            $data = $nodeData['data'] ?? [];
            $dbId = $data['dbId'] ?? null;

            if ($dbId) {
                $state = $version->states()->find($dbId);
                if ($state) {
                    $state->update([
                        'name' => $data['label'] ?? $state->name,
                        'type' => $data['type'] ?? $state->type,
                        'visual_coordinates' => $nodeData['position'] ?? $state->visual_coordinates,
                    ]);
                    $processedStateIds[] = $state->id;
                    $idMap[$nodeData['id']] = $state->id;
                }
            } else {
                $state = $version->states()->create([
                    'name' => $data['label'] ?? 'New State',
                    'type' => $data['type'] ?? 'TASK',
                    'visual_coordinates' => $nodeData['position'] ?? ['x' => 0, 'y' => 0],
                ]);
                $processedStateIds[] = $state->id;
                $idMap[$nodeData['id']] = $state->id;
            }
        }

        // Delete states not present in payload
        $version->states()->whereNotIn('id', $processedStateIds)->delete();

        // 2. Process Edges (Transitions)
        $processedTransitionIds = [];
        foreach ($frontendEdges as $edgeData) {
            $data = $edgeData['data'] ?? [];
            $dbId = $data['dbId'] ?? null;

            $sourceId = $idMap[$edgeData['source']] ?? $edgeData['source'];
            $targetId = $idMap[$edgeData['target']] ?? $edgeData['target'];

            if ($dbId) {
                $transition = $version->transitions()->find($dbId);
                if ($transition) {
                    $transition->update([
                        'source_state_id' => $sourceId,
                        'destination_state_id' => $targetId,
                        'label' => $edgeData['label'] ?? $transition->label,
                        'trigger' => $data['trigger'] ?? $transition->trigger,
                    ]);
                    $processedTransitionIds[] = $transition->id;
                }
            } else {
                if (is_numeric($sourceId) && is_numeric($targetId)) {
                    $transition = $version->transitions()->create([
                        'source_state_id' => $sourceId,
                        'destination_state_id' => $targetId,
                        'label' => $edgeData['label'] ?? null,
                        'trigger' => $data['trigger'] ?? 'MANUAL',
                    ]);
                    $processedTransitionIds[] = $transition->id;
                }
            }
        }

        $version->transitions()->whereNotIn('id', $processedTransitionIds)->delete();

        $workflow->load(['versions.states.actions', 'versions.transitions.actions']);
        return response()->json(['data' => $workflow]);
    }

    public function activate($id)
    {
        $tenantId = Auth::user()->tenant_id;
        $workflow = WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($id);

        // Deactivate all other workflows with the same base_record_type for this tenant
        // Since we are enforcing 1 active workflow per record type for simplicity in Phase 5
        WorkflowDefinition::where('tenant_id', $tenantId)
            ->where('base_record_type', $workflow->base_record_type)
            ->where('id', '!=', $id)
            ->update(['status' => 'archived']);

        $workflow->update(['status' => 'active']);

        // Set the latest version to active
        $version = $workflow->versions()->latest()->first();
        if ($version) {
            $workflow->versions()->update(['is_active' => false]);
            $version->update(['is_active' => true]);
        }

        return response()->json(['message' => 'Workflow activated successfully', 'data' => $workflow]);
    }
}
