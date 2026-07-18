<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\LeadActivity;
use App\Models\CurrencySetting;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
 
class LeadOrderToCashController extends Controller
{
    // === CURRENCY AND CALCULATION HELPERS ===

    private function getCurrencyOrError()
    {
        $currencySetting = CurrencySetting::with('currency')->first();
        if (!$currencySetting || !$currencySetting->currency) {
            abort(response()->json([
                'message' => 'Default currency is not configured. Please configure currency first.'
            ], 422));
        }
        return $currencySetting->currency;
    }

    private function calculateTotals(array $itemsData)
    {
        $subtotal = 0;
        $totalDiscount = 0;
        $totalTax = 0;
        $items = [];

        foreach ($itemsData as $item) {
            $qty = (float) $item['quantity'];
            $price = (float) $item['unit_price'];
            $discount = (float) ($item['discount_amount'] ?? 0);
            $tax = (float) ($item['tax_amount'] ?? 0);

            if ($qty <= 0) {
                throw new \InvalidArgumentException('Quantity must be greater than 0.');
            }
            if ($price < 0) {
                throw new \InvalidArgumentException('Unit price must be greater than or equal to 0.');
            }
            if ($discount < 0 || $discount > ($qty * $price)) {
                throw new \InvalidArgumentException('Discount cannot be negative and cannot exceed the line item total.');
            }
            if ($tax < 0) {
                throw new \InvalidArgumentException('Tax cannot be negative.');
            }

            $lineTotal = ($qty * $price) - $discount + $tax;
            if ($lineTotal < 0) {
                $lineTotal = 0;
            }

            $subtotal += ($qty * $price);
            $totalDiscount += $discount;
            $totalTax += $tax;

            $items[] = array_merge($item, [
                'quantity' => $qty,
                'unit_price' => $price,
                'discount_amount' => $discount,
                'tax_amount' => $tax,
                'total_amount' => $lineTotal
            ]);
        }

        return [
            'subtotal' => $subtotal,
            'discount' => $totalDiscount,
            'tax' => $totalTax,
            'total' => max(0, $subtotal - $totalDiscount + $totalTax),
            'items' => $items
        ];
    }

    private function isValidQuotationTransition(string $current, string $target): bool
    {
        if ($current === $target) {
            return true;
        }

        $transitions = [
            'draft' => ['submitted', 'cancelled'],
            'submitted' => ['approved', 'rejected', 'cancelled'],
            'approved' => ['sent', 'converted', 'cancelled'],
            'sent' => ['accepted', 'expired', 'cancelled'],
            'accepted' => ['converted', 'cancelled'],
            'rejected' => ['cancelled'],
            'expired' => ['cancelled'],
            'converted' => [],
            'cancelled' => [],
        ];

        return in_array($target, $transitions[$current] ?? []);
    }

    private function isValidSalesOrderTransition(string $current, string $target): bool
    {
        if ($current === $target) {
            return true;
        }

        $transitions = [
            'draft' => ['confirmed', 'cancelled'],
            'confirmed' => ['fulfilled', 'cancelled'],
            'fulfilled' => ['closed'],
            'closed' => [],
            'cancelled' => [],
        ];

        return in_array($target, $transitions[$current] ?? []);
    }

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
        $currency = $this->getCurrencyOrError();
        
        $validated = $request->validate([
            'quotation_type' => 'required|string|in:new,renewal,expansion',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date|after_or_equal:quotation_date',
            'customer_name' => 'nullable|string',
            'billing_entity' => 'nullable|string',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.billing_period' => 'required|string|in:one_time,monthly,quarterly,yearly',
        ]);

        try {
            $totals = $this->calculateTotals($validated['items']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return DB::transaction(function () use ($lead, $validated, $totals, $currency) {
            $quotation = $lead->quotations()->create([
                'quotation_number' => 'QT-' . date('Ym') . '-' . sprintf('%04d', mt_rand(1, 9999)),
                'quotation_type' => $validated['quotation_type'],
                'quotation_status' => 'draft',
                'quotation_date' => $validated['quotation_date'],
                'valid_until' => $validated['valid_until'] ?? null,
                'customer_name' => $validated['customer_name'] ?? $lead->company_name,
                'billing_entity' => $validated['billing_entity'] ?? null,
                'currency' => $currency->code,
                'subtotal_amount' => $totals['subtotal'],
                'discount_amount' => $totals['discount'],
                'tax_amount' => $totals['tax'],
                'total_amount' => $totals['total'],
                'notes' => $validated['notes'] ?? null,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'created_by' => Auth::id(),
            ]);

            foreach ($totals['items'] as $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'total_amount' => $item['total_amount'],
                    'billing_period' => $item['billing_period'],
                ]);
            }

            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'Quotation Created',
                'description' => "Quotation {$quotation->quotation_number} created with total amount " . number_format($quotation->total_amount, 2) . " {$quotation->currency}.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logCreated('quotations', $quotation);

            return response()->json(['data' => $quotation->load('items')], 201);
        });
    }

    public function showQuotation($id)
    {
        $quotation = LeadQuotation::with(['items', 'createdBy:id,name', 'approvedBy:id,name'])->findOrFail($id);
        return response()->json(['data' => $quotation]);
    }

    public function updateQuotation(Request $request, $id)
    {
        $quotation = LeadQuotation::findOrFail($id);

        if ($quotation->quotation_status !== 'draft') {
            return response()->json(['message' => 'Only draft quotations can be updated.'], 422);
        }

        $validated = $request->validate([
            'quotation_type' => 'required|string|in:new,renewal,expansion',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date|after_or_equal:quotation_date',
            'customer_name' => 'nullable|string',
            'billing_entity' => 'nullable|string',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.billing_period' => 'required|string|in:one_time,monthly,quarterly,yearly',
        ]);

        try {
            $totals = $this->calculateTotals($validated['items']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $original = $quotation->toArray();

        return DB::transaction(function () use ($quotation, $validated, $totals, $original) {
            $quotation->update([
                'quotation_type' => $validated['quotation_type'],
                'quotation_date' => $validated['quotation_date'],
                'valid_until' => $validated['valid_until'] ?? null,
                'customer_name' => $validated['customer_name'] ?? $quotation->customer_name,
                'billing_entity' => $validated['billing_entity'] ?? null,
                'subtotal_amount' => $totals['subtotal'],
                'discount_amount' => $totals['discount'],
                'tax_amount' => $totals['tax'],
                'total_amount' => $totals['total'],
                'notes' => $validated['notes'] ?? null,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
            ]);

            $quotation->items()->delete();

            foreach ($totals['items'] as $item) {
                $quotation->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'total_amount' => $item['total_amount'],
                    'billing_period' => $item['billing_period'],
                ]);
            }

            LeadActivity::create([
                'lead_id' => $quotation->lead_id,
                'activity_type' => 'Quotation Updated',
                'description' => "Quotation {$quotation->quotation_number} updated.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logUpdated('quotations', $quotation, $original);

            return response()->json(['data' => $quotation->load('items')]);
        });
    }

    public function destroyQuotation($id)
    {
        $quotation = LeadQuotation::findOrFail($id);

        if (!in_array($quotation->quotation_status, ['draft', 'cancelled'])) {
            return response()->json(['message' => 'Only draft or cancelled quotations can be deleted.'], 422);
        }

        DB::transaction(function () use ($quotation) {
            $quotation->items()->delete();
            $quotation->delete();

            LeadActivity::create([
                'lead_id' => $quotation->lead_id,
                'activity_type' => 'Quotation Deleted',
                'description' => "Quotation {$quotation->quotation_number} was deleted.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logDeleted('quotations', $quotation);
        });

        return response()->json(['message' => 'Quotation deleted successfully.']);
    }

    public function acceptQuotation($id)
    {
        return $this->updateQuotationStatusDirect($id, 'accepted');
    }

    public function rejectQuotation($id)
    {
        return $this->updateQuotationStatusDirect($id, 'rejected');
    }

    public function updateQuotationStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|string']);
        return $this->updateQuotationStatusDirect($id, $request->input('status'));
    }

    private function updateQuotationStatusDirect($id, string $targetStatus)
    {
        $quotation = LeadQuotation::findOrFail($id);
        $currentStatus = $quotation->quotation_status;

        if (!$this->isValidQuotationTransition($currentStatus, $targetStatus)) {
            return response()->json([
                'message' => "Invalid status transition from {$currentStatus} to {$targetStatus}."
            ], 422);
        }

        $original = $quotation->toArray();

        $updateData = ['quotation_status' => $targetStatus];
        if ($targetStatus === 'accepted') {
            $updateData['accepted_at'] = now();
        } elseif ($targetStatus === 'rejected') {
            $updateData['rejected_at'] = now();
        } elseif ($targetStatus === 'sent') {
            $updateData['sent_at'] = now();
        }

        $quotation->update($updateData);

        LeadActivity::create([
            'lead_id' => $quotation->lead_id,
            'activity_type' => 'Quotation Status Changed',
            'description' => "Quotation {$quotation->quotation_number} status changed from {$currentStatus} to {$targetStatus}.",
            'activity_date' => now(),
            'user_id' => Auth::id(),
        ]);

        AuditService::logUpdated('quotations', $quotation, $original);

        return response()->json(['data' => $quotation]);
    }

    public function convertToSalesOrder($id)
    {
        $quotation = LeadQuotation::with('items')->findOrFail($id);

        if (!in_array($quotation->quotation_status, ['approved', 'accepted'])) {
            return response()->json(['message' => 'Quotation must be Approved or Accepted first.'], 400);
        }

        // Prevent duplicate conversions
        $duplicateExists = LeadSalesOrder::where('quotation_id', $quotation->id)
            ->where('order_status', '!=', 'cancelled')
            ->exists();
        if ($duplicateExists) {
            return response()->json(['message' => 'This quotation has already been converted to an active Sales Order.'], 400);
        }

        return DB::transaction(function () use ($quotation) {
            $order = LeadSalesOrder::create([
                'lead_id' => $quotation->lead_id,
                'quotation_id' => $quotation->id,
                'sales_order_number' => 'SO-' . date('Ym') . '-' . sprintf('%04d', mt_rand(1, 9999)),
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
                'created_by' => Auth::id(),
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

            // Update Quotation Status to converted
            $originalQuotation = $quotation->toArray();
            $quotation->update(['quotation_status' => 'converted']);

            LeadActivity::create([
                'lead_id' => $quotation->lead_id,
                'activity_type' => 'Quotation Converted',
                'description' => "Quotation {$quotation->quotation_number} was converted to Sales Order {$order->sales_order_number}.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logCreated('sales_orders', $order);
            AuditService::logUpdated('quotations', $quotation, $originalQuotation);

            return response()->json(['data' => $order->load('items')], 201);
        });
    }

    // === SALES ORDER ===

    public function getSalesOrders($id)
    {
        $lead = Lead::findOrFail($id);
        return response()->json([
            'data' => $lead->salesOrders()->with(['items', 'createdBy:id,name', 'confirmedBy:id,name'])->orderByDesc('created_at')->get()
        ]);
    }

    public function storeSalesOrder(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        $currency = $this->getCurrencyOrError();

        $validated = $request->validate([
            'order_type' => 'required|string|in:new,renewal,expansion',
            'order_date' => 'required|date',
            'customer_name' => 'nullable|string',
            'billing_entity' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.billing_period' => 'required|string|in:one_time,monthly,quarterly,yearly',
        ]);

        try {
            $totals = $this->calculateTotals($validated['items']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return DB::transaction(function () use ($lead, $validated, $totals, $currency) {
            $order = $lead->salesOrders()->create([
                'sales_order_number' => 'SO-' . date('Ym') . '-' . sprintf('%04d', mt_rand(1, 9999)),
                'order_type' => $validated['order_type'],
                'order_status' => 'draft',
                'order_date' => $validated['order_date'],
                'customer_name' => $validated['customer_name'] ?? $lead->company_name,
                'billing_entity' => $validated['billing_entity'] ?? null,
                'currency' => $currency->code,
                'subtotal_amount' => $totals['subtotal'],
                'discount_amount' => $totals['discount'],
                'tax_amount' => $totals['tax'],
                'total_amount' => $totals['total'],
                'created_by' => Auth::id(),
            ]);

            foreach ($totals['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'total_amount' => $item['total_amount'],
                    'billing_period' => $item['billing_period'],
                ]);
            }

            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'Sales Order Created Directly',
                'description' => "Sales Order {$order->sales_order_number} created directly (without Quotation) with total amount " . number_format($order->total_amount, 2) . " {$order->currency}.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logCreated('sales_orders', $order);

            return response()->json(['data' => $order->load('items')], 201);
        });
    }

    public function showSalesOrder($id)
    {
        $order = LeadSalesOrder::with(['items', 'createdBy:id,name', 'confirmedBy:id,name'])->findOrFail($id);
        return response()->json(['data' => $order]);
    }

    public function updateSalesOrder(Request $request, $id)
    {
        $order = LeadSalesOrder::findOrFail($id);

        if ($order->order_status !== 'draft') {
            return response()->json(['message' => 'Only draft sales orders can be updated.'], 422);
        }

        $validated = $request->validate([
            'order_type' => 'required|string|in:new,renewal,expansion',
            'order_date' => 'required|date',
            'customer_name' => 'nullable|string',
            'billing_entity' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.billing_period' => 'required|string|in:one_time,monthly,quarterly,yearly',
        ]);

        try {
            $totals = $this->calculateTotals($validated['items']);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $original = $order->toArray();

        return DB::transaction(function () use ($order, $validated, $totals, $original) {
            $order->update([
                'order_type' => $validated['order_type'],
                'order_date' => $validated['order_date'],
                'customer_name' => $validated['customer_name'] ?? $order->customer_name,
                'billing_entity' => $validated['billing_entity'] ?? null,
                'subtotal_amount' => $totals['subtotal'],
                'discount_amount' => $totals['discount'],
                'tax_amount' => $totals['tax'],
                'total_amount' => $totals['total'],
            ]);

            $order->items()->delete();

            foreach ($totals['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'] ?? 0,
                    'tax_amount' => $item['tax_amount'] ?? 0,
                    'total_amount' => $item['total_amount'],
                    'billing_period' => $item['billing_period'],
                ]);
            }

            LeadActivity::create([
                'lead_id' => $order->lead_id,
                'activity_type' => 'Sales Order Updated',
                'description' => "Sales Order {$order->sales_order_number} updated.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logUpdated('sales_orders', $order, $original);

            return response()->json(['data' => $order->load('items')]);
        });
    }

    public function confirmSalesOrder($id)
    {
        $order = LeadSalesOrder::findOrFail($id);
        $currentStatus = $order->order_status;

        if (!$this->isValidSalesOrderTransition($currentStatus, 'confirmed')) {
            return response()->json([
                'message' => "Invalid status transition from {$currentStatus} to confirmed."
            ], 422);
        }

        $original = $order->toArray();

        DB::transaction(function () use ($order, $original) {
            $order->update([
                'order_status' => 'confirmed',
                'confirmed_at' => now(),
                'confirmed_by' => Auth::id()
            ]);

            // Sync revenue to Lead
            $lead = $order->lead;
            if ($order->order_type === 'new') {
                $lead->realized_closing_amount = $lead->salesOrders()
                    ->where('order_type', 'new')
                    ->where('order_status', 'confirmed')
                    ->sum('total_amount');
                
                $closedWonStage = \App\Models\FunnelStage::where('name', 'Closed Won')->first();
                if ($closedWonStage) {
                    $lead->funnel_stage_id = $closedWonStage->id;
                }
                $lead->save();
            }

            LeadActivity::create([
                'lead_id' => $order->lead_id,
                'activity_type' => 'Sales Order Confirmed',
                'description' => "Sales Order {$order->sales_order_number} was confirmed.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logUpdated('sales_orders', $order, $original);
        });

        return response()->json(['data' => $order]);
    }

    public function cancelSalesOrder($id)
    {
        $order = LeadSalesOrder::findOrFail($id);
        $currentStatus = $order->order_status;

        if (!$this->isValidSalesOrderTransition($currentStatus, 'cancelled')) {
            return response()->json([
                'message' => "Invalid status transition from {$currentStatus} to cancelled."
            ], 422);
        }

        $original = $order->toArray();

        DB::transaction(function () use ($order, $original) {
            $order->update([
                'order_status' => 'cancelled'
            ]);

            // If it was a 'new' confirmed sales order that got cancelled, recalculate Lead closing amount
            $lead = $order->lead;
            if ($order->order_type === 'new') {
                $lead->realized_closing_amount = $lead->salesOrders()
                    ->where('order_type', 'new')
                    ->where('order_status', 'confirmed')
                    ->sum('total_amount');
                $lead->save();
            }

            LeadActivity::create([
                'lead_id' => $order->lead_id,
                'activity_type' => 'Sales Order Cancelled',
                'description' => "Sales Order {$order->sales_order_number} was cancelled.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logUpdated('sales_orders', $order, $original);
        });

        return response()->json(['data' => $order]);
    }

    public function closeSalesOrder($id)
    {
        $order = LeadSalesOrder::findOrFail($id);
        $currentStatus = $order->order_status;

        if (!$this->isValidSalesOrderTransition($currentStatus, 'closed')) {
            return response()->json([
                'message' => "Invalid status transition from {$currentStatus} to closed."
            ], 422);
        }

        $original = $order->toArray();

        DB::transaction(function () use ($order, $original) {
            $order->update([
                'order_status' => 'closed'
            ]);

            LeadActivity::create([
                'lead_id' => $order->lead_id,
                'activity_type' => 'Sales Order Closed',
                'description' => "Sales Order {$order->sales_order_number} was closed.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logUpdated('sales_orders', $order, $original);
        });

        return response()->json(['data' => $order]);
    }

    public function createRenewalQuotation(Request $request, $id)
    {
        $order = LeadSalesOrder::with('items')->findOrFail($id);
        $currency = $this->getCurrencyOrError();
        
        return DB::transaction(function () use ($order, $currency) {
            $quotation = LeadQuotation::create([
                'lead_id' => $order->lead_id,
                'quotation_number' => 'REN-' . date('Ym') . '-' . sprintf('%04d', mt_rand(1, 9999)),
                'quotation_type' => 'renewal',
                'quotation_status' => 'draft',
                'quotation_date' => now()->toDateString(),
                'customer_name' => $order->customer_name,
                'billing_entity' => $order->billing_entity,
                'currency' => $currency->code,
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'tax_amount' => $order->tax_amount,
                'total_amount' => $order->total_amount,
                'created_by' => Auth::id(),
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

            LeadActivity::create([
                'lead_id' => $order->lead_id,
                'activity_type' => 'Renewal Quotation Created',
                'description' => "Renewal Quotation {$quotation->quotation_number} generated from Sales Order {$order->sales_order_number}.",
                'activity_date' => now(),
                'user_id' => Auth::id(),
            ]);

            AuditService::logCreated('quotations', $quotation);

            return response()->json(['data' => $quotation->load('items')], 201);
        });
    }
}
