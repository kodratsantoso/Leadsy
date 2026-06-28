<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LarkBaseConnection;
use App\Models\LarkBaseFieldMapping;
use App\Jobs\SyncLeadToLarkBaseJob;

class LarkBaseMappingController extends Controller
{
    /**
     * List all connections and their field mappings
     */
    public function index(Request $request)
    {
        $connections = LarkBaseConnection::with('fieldMappings')->get();
        
        $mapped = $connections->map(function ($conn) {
            $fieldMapping = [];
            foreach ($conn->fieldMappings as $mapping) {
                $fieldMapping[$mapping->leadsy_field_key] = $mapping->lark_field_id;
            }
            return [
                'id' => $conn->id,
                'app_token' => $conn->app_token,
                'table_id' => $conn->table_id,
                'table_name' => $conn->name,
                'sync_direction' => 'two_way',
                'field_mapping' => $fieldMapping,
                'is_active' => $conn->is_active,
            ];
        });

        return response()->json([
            'data' => $mapped
        ]);
    }

    /**
     * Create or update a field mapping
     */
    public function store(Request $request)
    {
        $request->validate([
            'app_token' => 'required|string',
            'table_id' => 'required|string',
            'table_name' => 'nullable|string',
            'field_mapping' => 'required|array',
        ]);

        $connection = LarkBaseConnection::updateOrCreate(
            [
                'app_token' => $request->app_token,
                'table_id' => $request->table_id,
            ],
            [
                'name' => $request->table_name ?: $request->table_id,
                'is_active' => $request->is_active ?? true,
            ]
        );
        
        foreach ($request->field_mapping as $leadsyKey => $larkFieldName) {
            LarkBaseFieldMapping::updateOrCreate(
                [
                    'connection_id' => $connection->id,
                    'leadsy_field_key' => $leadsyKey,
                ],
                [
                    'leadsy_entity_type' => 'lead',
                    'lark_field_id' => $larkFieldName, // We store the field name as ID for now since frontend maps it this way
                    'sync_direction' => 'two_way',
                    'is_active' => true,
                ]
            );
        }

        return response()->json([
            'message' => 'Mappings updated successfully.',
            'connection' => $connection->load('fieldMappings')
        ]);
    }

    /**
     * Manually trigger a sync for all leads or a batch
     */
    public function retriggerSync(Request $request, $mappingId)
    {
        $connection = LarkBaseConnection::findOrFail($mappingId);
        
        // Dispatch job for recent leads or all leads
        // In a real scenario, this might chunk and dispatch multiple jobs.
        // For now, we'll chunk and dispatch SyncLeadToLarkBaseJob
        $direction = $request->input('direction', 'push');
        
        if ($direction === 'push') {
            \App\Models\Lead::chunk(100, function ($leads) {
                foreach ($leads as $lead) {
                    SyncLeadToLarkBaseJob::dispatch($lead->id);
                }
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'Batch sync started successfully',
            'synced_count' => 0,
            'attempted_count' => \App\Models\Lead::count(),
            'skipped_count' => 0,
            'added_count' => 0,
            'updated_count' => 0,
            'deleted_count' => 0,
            'failed_count' => 0,
            'error_count' => 0,
            'errors' => []
        ]);
    }

    /**
     * Delete a connection and its mappings
     */
    public function destroy($id)
    {
        $connection = LarkBaseConnection::findOrFail($id);
        $connection->delete();

        return response()->json([
            'message' => 'Mapping deleted successfully'
        ]);
    }

    /**
     * Trigger sync for a single lead
     */
    public function syncSingleLead(Request $request, $leadId)
    {
        SyncLeadToLarkBaseJob::dispatch($leadId);
        return response()->json([
            'message' => 'Lark Base sync job dispatched for the lead.'
        ]);
    }
}
