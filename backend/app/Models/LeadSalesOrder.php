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
        'created_by', 'confirmed_by', 'confirmed_at'
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
