<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use Illuminate\Http\Request;

class LeadOrderToCashController extends Controller
{
    // === QUOTATION ===
    
    public function getQuotations($id)
    {
        $lead = Lead::findOrFail($id);
        return response()->json([
            'data' => $lead->quotations()->with(['items', 'createdBy:id,name', 'approvedBy:id,name'])->orderByDesc('created_at')->get()
        ]);
    }

    public function storeQuotation(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        $validated = $request->validate([
            'quotation_type' => 'required|string|in:new,renewal,expansion',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date',
            'customer_name' => 'nullable|string',
            'billing_entity' => 'nullable|string',
            'currency' => 'nullable|string|max:3',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.billing_period' => 'required|string|in:one_time,monthly,quarterly,yearly',
        ]);

        $subtotal = 0;
        $totalDiscount = 0;
        $totalTax = 0;

        foreach ($validated['items'] as $item) {
            $itemTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount_amount'] ?? 0) + ($item['tax_amount'] ?? 0);
            $subtotal += ($item['quantity'] * $item['unit_price']);
            $totalDiscount += ($item['discount_amount'] ?? 0);
            $totalTax += ($item['tax_amount'] ?? 0);
        }

        $quotation = $lead->quotations()->create([
            'quotation_number' => 'QT-' . date('YmdHis') . '-' . mt_rand(100, 999),
            'quotation_type' => $validated['quotation_type'],
            'quotation_status' => 'draft',
            'quotation_date' => $validated['quotation_date'],
            'valid_until' => $validated['valid_until'] ?? null,
            'customer_name' => $validated['customer_name'] ?? $lead->company_name,
            'billing_entity' => $validated['billing_entity'] ?? null,
            'currency' => $validated['currency'] ?? 'IDR',
            'subtotal_amount' => $subtotal,
            'discount_amount' => $totalDiscount,
            'tax_amount' => $totalTax,
            'total_amount' => $subtotal - $totalDiscount + $totalTax,
            'notes' => $validated['notes'] ?? null,
            'terms_conditions' => $validated['terms_conditions'] ?? null,
            'created_by' => auth()->id(),
        ]);

        foreach ($validated['items'] as $item) {
            $itemTotal = ($item['quantity'] * $item['unit_price']) - ($item['discount_amount'] ?? 0) + ($item['tax_amount'] ?? 0);
            $quotation->items()->create([
                'product_id' => $item['product_id'] ?? null,
                'item_name' => $item['item_name'],
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'discount_amount' => $item['discount_amount'] ?? 0,
                'tax_amount' => $item['tax_amount'] ?? 0,
                'total_amount' => $itemTotal,
                'billing_period' => $item['billing_period'],
            ]);
        }

        return response()->json(['data' => $quotation->load('items')], 201);
    }

    public function showQuotation($id)
    {
        $quotation = LeadQuotation::with(['items', 'createdBy:id,name', 'approvedBy:id,name'])->findOrFail($id);
        return response()->json(['data' => $quotation]);
    }

    public function acceptQuotation($id)
    {
        $quotation = LeadQuotation::findOrFail($id);
        $quotation->update([
            'quotation_status' => 'accepted',
            'accepted_at' => now(),
        ]);
        return response()->json(['data' => $quotation]);
    }

    public function rejectQuotation($id)
    {
        $quotation = LeadQuotation::findOrFail($id);
        $quotation->update([
            'quotation_status' => 'rejected',
            'rejected_at' => now(),
        ]);
        return response()->json(['data' => $quotation]);
    }

    public function convertToSalesOrder($id)
    {
        $quotation = LeadQuotation::with('items')->findOrFail($id);
        if ($quotation->quotation_status !== 'accepted') {
            return response()->json(['message' => 'Quotation must be accepted first.'], 400);
        }

        $order = LeadSalesOrder::create([
            'lead_id' => $quotation->lead_id,
            'quotation_id' => $quotation->id,
            'sales_order_number' => 'SO-' . date('YmdHis') . '-' . mt_rand(100, 999),
            'order_type' => $quotation->quotation_type,
            'order_status' => 'draft',
            'order_date' => now()->toDateString(),
            'customer_name' => $quotation->customer_name,
            'billing_entity' => $quotation->billing_entity,
            'currency' => $quotation->currency,
            'subtotal_amount' => $quotation->subtotal_amount,
            'discount_amount' => $quotation->discount_amount,
            'tax_amount' => $quotation->tax_amount,
            'total_amount' => $quotation->total_amount,
            'created_by' => auth()->id(),
        ]);

        foreach ($quotation->items as $item) {
            $order->items()->create([
                'quotation_item_id' => $item->id,
                'product_id' => $item->product_id,
                'item_name' => $item->item_name,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount_amount' => $item->discount_amount,
                'tax_amount' => $item->tax_amount,
                'total_amount' => $item->total_amount,
                'billing_period' => $item->billing_period,
            ]);
        }

        return response()->json(['data' => $order->load('items')], 201);
    }

    // === SALES ORDER ===

    public function getSalesOrders($id)
    {
        $lead = Lead::findOrFail($id);
        return response()->json([
            'data' => $lead->salesOrders()->with(['items', 'createdBy:id,name', 'confirmedBy:id,name'])->orderByDesc('created_at')->get()
        ]);
    }

    public function showSalesOrder($id)
    {
        $order = LeadSalesOrder::with(['items', 'createdBy:id,name', 'confirmedBy:id,name'])->findOrFail($id);
        return response()->json(['data' => $order]);
    }

    public function confirmSalesOrder($id)
    {
        $order = LeadSalesOrder::findOrFail($id);
        $order->update([
            'order_status' => 'confirmed',
            'confirmed_at' => now(),
            'confirmed_by' => auth()->id()
        ]);

        // Sync revenue to Lead
        $lead = $order->lead;
        if ($order->order_type === 'new') {
            $lead->realized_closing_amount = $lead->salesOrders()->where('order_type', 'new')->where('order_status', 'confirmed')->sum('total_amount');
            // Move to Closed Won if configured
            $closedWonStage = \App\Models\FunnelStage::where('name', 'Closed Won')->first();
            if ($closedWonStage) {
                $lead->funnel_stage_id = $closedWonStage->id;
            }
            $lead->save();
        }

        return response()->json(['data' => $order]);
    }

    public function createRenewalQuotation(Request $request, $id)
    {
        $order = LeadSalesOrder::with('items')->findOrFail($id);
        
        $quotation = LeadQuotation::create([
            'lead_id' => $order->lead_id,
            'quotation_number' => 'REN-' . date('YmdHis') . '-' . mt_rand(100, 999),
            'quotation_type' => 'renewal',
            'quotation_status' => 'draft',
            'quotation_date' => now()->toDateString(),
            'customer_name' => $order->customer_name,
            'billing_entity' => $order->billing_entity,
            'currency' => $order->currency,
            'subtotal_amount' => $order->subtotal_amount,
            'discount_amount' => $order->discount_amount,
            'tax_amount' => $order->tax_amount,
            'total_amount' => $order->total_amount,
            'created_by' => auth()->id(),
        ]);

        foreach ($order->items as $item) {
            $quotation->items()->create([
                'product_id' => $item->product_id,
                'item_name' => $item->item_name,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'discount_amount' => $item->discount_amount,
                'tax_amount' => $item->tax_amount,
                'total_amount' => $item->total_amount,
                'billing_period' => $item->billing_period,
            ]);
        }

        return response()->json(['data' => $quotation->load('items')], 201);
    }
}
