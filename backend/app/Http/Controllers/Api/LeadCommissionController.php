<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadCommissionAllocation;
use App\Models\LeadSalesOrder;
use Illuminate\Http\Request;

class LeadCommissionController extends Controller
{
    public function index($id)
    {
        $lead = Lead::findOrFail($id);
        return response()->json([
            'data' => $lead->commissionAllocations()->with(['order', 'user:id,name'])->get()
        ]);
    }

    public function generateDraft(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        $order = LeadSalesOrder::findOrFail($request->order_id);

        if ($order->order_status !== 'confirmed') {
            return response()->json(['message' => 'Only confirmed orders can generate commission allocations.'], 400);
        }

        // Delete existing draft allocations for this order to avoid duplicates
        $lead->commissionAllocations()->where('order_id', $order->id)->where('commission_status', 'draft')->delete();

        $allocations = [];
        foreach ($lead->roleAssignments as $assignment) {
            $basis = $order->total_amount;
            $percentage = $assignment->contribution_percentage;
            
            $allocations[] = $lead->commissionAllocations()->create([
                'order_id' => $order->id,
                'user_id' => $assignment->user_id,
                'role_type' => $assignment->role_type,
                'contribution_percentage' => $percentage,
                'revenue_basis' => $basis,
                'commission_status' => 'draft',
                'calculation_snapshot_json' => [
                    'order_total' => $basis,
                    'percentage' => $percentage,
                    'generated_at' => now()->toIso8601String()
                ]
            ]);
        }

        return response()->json(['data' => collect($allocations)->load(['order', 'user:id,name'])], 201);
    }
}
