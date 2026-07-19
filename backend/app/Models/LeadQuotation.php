<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadQuotation extends Model
{
    protected $fillable = [
        'lead_id', 'quotation_number', 'quotation_type', 'quotation_status',
        'quotation_date', 'valid_until', 'customer_name', 'billing_entity',
        'currency', 'subtotal_amount', 'discount_amount', 'tax_amount', 'total_amount',
        'notes', 'terms_conditions', 'created_by', 'approved_by',
        'sent_at', 'accepted_at', 'rejected_at',
        
        // Extended NetSuite-style fields
        'contact_id', 'sales_owner_id', 'presales_owner_id', 'payment_terms',
        'billing_frequency', 'contract_start_date', 'contract_end_date',
        'expected_close_date', 'probability', 'forecast_type', 'tax_included',
        'header_discount_type', 'header_discount_value', 'header_discount_amount',
        'total_line_discount', 'other_cost', 'scope_of_work', 'exclusions',
        'delivery_timeline', 'warranty_support_terms', 'customer_notes',
        'internal_notes', 'approval_status', 'pdf_url', 'converted_sales_order_id',
        
        // WHT fields
        'total_withholding_tax', 'grand_total_before_wht'
    ];

    protected $casts = [
        'quotation_date' => 'date',
        'valid_until' => 'date',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sent_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        
        // Extended casts
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'expected_close_date' => 'date',
        'probability' => 'integer',
        'tax_included' => 'boolean',
        'header_discount_value' => 'decimal:2',
        'header_discount_amount' => 'decimal:2',
        'total_line_discount' => 'decimal:2',
        'other_cost' => 'decimal:2',
        'total_withholding_tax' => 'decimal:2',
        'grand_total_before_wht' => 'decimal:2',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact()
    {
        return $this->belongsTo(LeadContact::class, 'contact_id');
    }

    public function salesOwner()
    {
        return $this->belongsTo(User::class, 'sales_owner_id');
    }

    public function presalesOwner()
    {
        return $this->belongsTo(User::class, 'presales_owner_id');
    }

    public function items()
    {
        return $this->hasMany(LeadQuotationItem::class, 'quotation_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function convertedSalesOrder()
    {
        return $this->belongsTo(LeadSalesOrder::class, 'converted_sales_order_id');
    }
}
