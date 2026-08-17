<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $quotation_id
 * @property int|null $parent_sales_order_id
 * @property string $sales_order_number
 * @property string $order_type
 * @property string $order_status
 * @property \Illuminate\Support\Carbon $order_date
 * @property string|null $customer_name
 * @property string|null $billing_entity
 * @property string $currency
 * @property numeric $subtotal_amount
 * @property numeric $discount_amount
 * @property numeric $tax_amount
 * @property numeric $total_amount
 * @property numeric|null $recurring_amount
 * @property \Illuminate\Support\Carbon|null $contract_start_date
 * @property \Illuminate\Support\Carbon|null $contract_end_date
 * @property \Illuminate\Support\Carbon|null $renewal_date
 * @property int|null $created_by
 * @property int|null $confirmed_by
 * @property \Illuminate\Support\Carbon|null $confirmed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property numeric $total_withholding_tax
 * @property numeric $grand_total_before_wht
 * @property int|null $contact_id
 * @property int|null $sales_owner_id
 * @property int|null $presales_owner_id
 * @property int|null $account_manager_id
 * @property string $source_type
 * @property string|null $spk_number
 * @property string|null $customer_po_number
 * @property string|null $lead_source
 * @property string|null $channel
 * @property \Illuminate\Support\Carbon|null $expected_fulfillment_date
 * @property \Illuminate\Support\Carbon|null $sales_effective_date
 * @property string|null $payment_terms
 * @property string|null $billing_frequency
 * @property bool $tax_included
 * @property string|null $header_discount_type
 * @property numeric|null $header_discount_value
 * @property numeric $header_discount_amount
 * @property numeric $total_line_discount
 * @property numeric $other_cost
 * @property string|null $scope_of_work
 * @property string|null $exclusions
 * @property string|null $delivery_timeline
 * @property string|null $warranty_support_terms
 * @property string|null $customer_notes
 * @property string|null $internal_notes
 * @property string|null $terms_conditions
 * @property string|null $department
 * @property string|null $cost_center
 * @property string|null $location
 * @property string|null $industry
 * @property string|null $business_category
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $fulfilled_at
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property int|null $bank_account_id
 * @property-read \App\Models\CompanyBankAccount|null $bankAccount
 * @property-read \Illuminate\Database\Eloquent\Collection<int, LeadSalesOrder> $childSalesOrders
 * @property-read int|null $child_sales_orders_count
 * @property-read \App\Models\User|null $confirmedBy
 * @property-read \App\Models\User|null $createdBy
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadSalesOrderItem> $items
 * @property-read int|null $items_count
 * @property-read \App\Models\Lead|null $lead
 * @property-read LeadSalesOrder|null $parentSalesOrder
 * @property-read \App\Models\LeadQuotation|null $quotation
 * @property-read \App\Models\User|null $salesOwner
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereAccountManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereBankAccountId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereBillingEntity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereBillingFrequency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereBusinessCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCancelledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereChannel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereClosedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereConfirmedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereConfirmedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereContactId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereContractEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereContractStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCostCenter($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCustomerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCustomerNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereCustomerPoNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereDeliveryTimeline($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereDepartment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereExclusions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereExpectedFulfillmentDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereFulfilledAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereGrandTotalBeforeWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereHeaderDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereHeaderDiscountType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereHeaderDiscountValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereInternalNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereLeadSource($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereOrderDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereOrderStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereOrderType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereOtherCost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereParentSalesOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder wherePaymentTerms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder wherePresalesOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereRecurringAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereRenewalDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSalesEffectiveDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSalesOrderNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSalesOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereScopeOfWork($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSpkNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereSubtotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTaxIncluded($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTermsConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTotalLineDiscount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereTotalWithholdingTax($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereUpdatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadSalesOrder whereWarrantySupportTerms($value)
 * @mixin \Eloquent
 */
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
        'closed_at', 'cancelled_at',
        
        // Bank Account selected
        'bank_account_id'
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

    public function bankAccount()
    {
        return $this->belongsTo(CompanyBankAccount::class, 'bank_account_id');
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

    public function salesOwner()
    {
        return $this->belongsTo(User::class, 'sales_owner_id');
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
