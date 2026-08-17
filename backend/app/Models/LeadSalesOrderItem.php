<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $sales_order_id
 * @property int|null $quotation_item_id
 * @property int|null $product_id
 * @property string $item_name
 * @property string|null $description
 * @property numeric $quantity
 * @property numeric $unit_price
 * @property numeric $discount_amount
 * @property numeric $tax_amount
 * @property numeric $total_amount
 * @property string $billing_period
 * @property \Illuminate\Support\Carbon|null $start_date
 * @property \Illuminate\Support\Carbon|null $end_date
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $product_tier_id
 * @property string|null $pricing_model
 * @property string|null $billing_cycle
 * @property string|null $price_source
 * @property int|null $tax_code_id
 * @property numeric $tax_rate
 * @property int|null $withholding_tax_code_id
 * @property numeric $withholding_tax_rate
 * @property numeric $withholding_tax_amount
 * @property numeric $line_total_before_wht
 * @property numeric $line_total_after_wht
 * @property int|null $duration_value
 * @property string|null $duration_unit
 * @property string|null $unit
 * @property string|null $line_discount_type
 * @property numeric|null $line_discount_value
 * @property numeric $line_discount_amount
 * @property string|null $tax_code
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $service_start_date
 * @property \Illuminate\Support\Carbon|null $service_end_date
 * @property-read \App\Models\Product|null $product
 * @property-read \App\Models\ProductTier|null $productTier
 * @property-read \App\Models\LeadQuotationItem|null $quotationItem
 * @property-read \App\Models\LeadSalesOrder $salesOrder
 * @property-read \App\Models\TaxCode|null $taxCode
 * @property-read \App\Models\WithholdingTaxCode|null $withholdingTaxCode
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereBillingCycle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereBillingPeriod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereDurationUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereDurationValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereItemName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereLineDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereLineDiscountType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereLineDiscountValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereLineTotalAfterWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereLineTotalBeforeWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem wherePriceSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem wherePricingModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereProductTierId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereQuotationItemId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereSalesOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereServiceEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereServiceStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereTaxCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereTaxCodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereTaxRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereUnitPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereWithholdingTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereWithholdingTaxCodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrderItem whereWithholdingTaxRate($value)
 * @mixin \Eloquent
 */
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
        'duration_value', 'duration_unit',
        
        // Expanded columns
        'unit', 'line_discount_type', 'line_discount_value', 'line_discount_amount',
        'tax_code', 'sort_order', 'service_start_date', 'service_end_date'
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

        'line_discount_value' => 'decimal:2',
        'line_discount_amount' => 'decimal:2',
        'sort_order' => 'integer',
        'service_start_date' => 'date',
        'service_end_date' => 'date',
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
