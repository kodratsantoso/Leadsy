<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadSalesOrderItem extends Model
{
    protected $fillable = [
        'sales_order_id', 'quotation_item_id', 'product_id', 'item_name', 'description',
        'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'total_amount',
        'billing_period', 'start_date', 'end_date',
        
        // Extended NetSuite / Tier / Tax / WHT fields
        'product_tier_id', 'pricing_model', 'billing_cycle', 'price_source',
        'tax_code_id', 'tax_rate', 'withholding_tax_code_id', 'withholding_tax_rate',
        'withholding_tax_amount', 'line_total_before_wht', 'line_total_after_wht',
        'duration_value', 'duration_unit'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        
        // Extended casts
        'tax_rate' => 'decimal:2',
        'withholding_tax_rate' => 'decimal:2',
        'withholding_tax_amount' => 'decimal:2',
        'line_total_before_wht' => 'decimal:2',
        'line_total_after_wht' => 'decimal:2',
        'duration_value' => 'integer',
        'duration_unit' => 'string',
    ];

    public function salesOrder()
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function quotationItem()
    {
        return $this->belongsTo(LeadQuotationItem::class, 'quotation_item_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function productTier()
    {
        return $this->belongsTo(ProductTier::class, 'product_tier_id');
    }

    public function taxCode()
    {
        return $this->belongsTo(TaxCode::class, 'tax_code_id');
    }

    public function withholdingTaxCode()
    {
        return $this->belongsTo(WithholdingTaxCode::class, 'withholding_tax_code_id');
    }
}
