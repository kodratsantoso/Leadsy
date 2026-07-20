<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadSalesOrder extends Model
{
    protected $fillable = [
        'lead_id', 'quotation_id', 'parent_sales_order_id', 'sales_order_number',
        'order_type', 'order_status', 'order_date', 'customer_name', 'billing_entity',
        'currency', 'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount',
        'recurring_amount', 'contract_start_date', 'contract_end_date', 'renewal_date',
        'created_by', 'confirmed_by', 'confirmed_at',
        
        // WHT fields
        'total_withholding_tax', 'grand_total_before_wht',

        // Extended NetSuite columns
        'contact_id', 'sales_owner_id', 'presales_owner_id', 'account_manager_id',
        'source_type', 'spk_number', 'customer_po_number', 'lead_source', 'channel',
        'expected_fulfillment_date', 'sales_effective_date', 'payment_terms',
        'billing_frequency', 'tax_included', 'header_discount_type',
        'header_discount_value', 'header_discount_amount', 'total_line_discount',
        'other_cost', 'scope_of_work', 'exclusions', 'delivery_timeline',
        'warranty_support_terms', 'customer_notes', 'internal_notes',
        'terms_conditions', 'department', 'cost_center', 'location',
        'industry', 'business_category', 'updated_by', 'fulfilled_at',
        'closed_at', 'cancelled_at'
    ];

    protected $casts = [
        'order_date' => 'date',
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'renewal_date' => 'date',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'recurring_amount' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'total_withholding_tax' => 'decimal:2',
        'grand_total_before_wht' => 'decimal:2',

        'expected_fulfillment_date' => 'date',
        'sales_effective_date' => 'date',
        'tax_included' => 'boolean',
        'header_discount_value' => 'decimal:2',
        'header_discount_amount' => 'decimal:2',
        'total_line_discount' => 'decimal:2',
        'other_cost' => 'decimal:2',
        'fulfilled_at' => 'datetime',
        'closed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function quotation()
    {
        return $this->belongsTo(LeadQuotation::class, 'quotation_id');
    }

    public function parentSalesOrder()
    {
        return $this->belongsTo(LeadSalesOrder::class, 'parent_sales_order_id');
    }

    public function childSalesOrders()
    {
        return $this->hasMany(LeadSalesOrder::class, 'parent_sales_order_id');
    }

    public function items()
    {
        return $this->hasMany(LeadSalesOrderItem::class, 'sales_order_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
