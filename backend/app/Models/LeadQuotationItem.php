<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $quotation_id
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
 * @property string|null $unit
 * @property string|null $line_discount_type
 * @property numeric|null $line_discount_value
 * @property numeric $line_discount_amount
 * @property string|null $tax_code
 * @property numeric $tax_rate
 * @property int $sort_order
 * @property int|null $product_tier_id
 * @property string|null $pricing_model
 * @property string|null $price_source
 * @property int|null $tax_code_id
 * @property int|null $withholding_tax_code_id
 * @property numeric $withholding_tax_rate
 * @property numeric $withholding_tax_amount
 * @property numeric $line_total_before_wht
 * @property numeric $line_total_after_wht
 * @property int|null $duration_value
 * @property string|null $duration_unit
 * @property string|null $source_type
 * @property int|null $source_reference_id
 * @property int|null $professional_service_estimation_id
 * @property int|null $professional_service_estimation_line_id
 * @property-read \App\Models\Product|null $product
 * @property-read \App\Models\ProductTier|null $productTier
 * @property-read \App\Models\PsEstimation|null $psEstimation
 * @property-read \App\Models\PsEstimationLine|null $psEstimationLine
 * @property-read \App\Models\LeadQuotation $quotation
 * @property-read \App\Models\TaxCode|null $taxCode
 * @property-read \App\Models\WithholdingTaxCode|null $withholdingTaxCode
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereBillingPeriod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereDurationUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereDurationValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereItemName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereLineDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereLineDiscountType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereLineDiscountValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereLineTotalAfterWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereLineTotalBeforeWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem wherePriceSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem wherePricingModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereProductTierId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereProfessionalServiceEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereProfessionalServiceEstimationLineId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereQuantity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereSourceReferenceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereTaxCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereTaxCodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereTaxRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereUnitPrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereWithholdingTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereWithholdingTaxCodeId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotationItem whereWithholdingTaxRate($value)
 * @mixin \Eloquent
 */
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
        'duration_value', 'duration_unit',

        // Source tracking
        'source_type', 'source_reference_id', 
        'professional_service_estimation_id', 'professional_service_estimation_line_id'
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

    public function psEstimation()
    {
        return $this->belongsTo(PsEstimation::class, 'professional_service_estimation_id');
    }

    public function psEstimationLine()
    {
        return $this->belongsTo(PsEstimationLine::class, 'professional_service_estimation_line_id');
    }
}
