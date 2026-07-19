<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadQuotationItem extends Model
{
    protected $fillable = [
        'quotation_id', 'product_id', 'item_name', 'description',
        'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'total_amount',
        'billing_period', 'start_date', 'end_date',
        
        // Extended NetSuite-style fields
        'unit', 'line_discount_type', 'line_discount_value', 'line_discount_amount',
        'tax_code', 'tax_rate', 'sort_order',
        
        // Product Tier, Tax settings, WHT extensions
        'product_tier_id', 'pricing_model', 'price_source', 'tax_code_id',
        'withholding_tax_code_id', 'withholding_tax_rate', 'withholding_tax_amount',
        'line_total_before_wht', 'line_total_after_wht',
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
        'line_discount_value' => 'decimal:2',
        'line_discount_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'sort_order' => 'integer',
        'withholding_tax_rate' => 'decimal:2',
        'withholding_tax_amount' => 'decimal:2',
        'line_total_before_wht' => 'decimal:2',
        'line_total_after_wht' => 'decimal:2',
        'duration_value' => 'integer',
        'duration_unit' => 'string',
    ];

    public function quotation()
    {
        return $this->belongsTo(LeadQuotation::class, 'quotation_id');
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
