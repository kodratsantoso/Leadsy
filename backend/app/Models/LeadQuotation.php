<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $quotation_number
 * @property string $quotation_type
 * @property string $quotation_status
 * @property \Illuminate\Support\Carbon $quotation_date
 * @property \Illuminate\Support\Carbon|null $valid_until
 * @property string|null $customer_name
 * @property string|null $billing_entity
 * @property string $currency
 * @property numeric $subtotal_amount
 * @property numeric $discount_amount
 * @property numeric $tax_amount
 * @property numeric $total_amount
 * @property string|null $notes
 * @property string|null $terms_conditions
 * @property int|null $created_by
 * @property int|null $approved_by
 * @property \Illuminate\Support\Carbon|null $sent_at
 * @property \Illuminate\Support\Carbon|null $accepted_at
 * @property \Illuminate\Support\Carbon|null $rejected_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $contact_id
 * @property int|null $sales_owner_id
 * @property int|null $presales_owner_id
 * @property string|null $payment_terms
 * @property string|null $billing_frequency
 * @property \Illuminate\Support\Carbon|null $contract_start_date
 * @property \Illuminate\Support\Carbon|null $contract_end_date
 * @property \Illuminate\Support\Carbon|null $expected_close_date
 * @property int|null $probability
 * @property string|null $forecast_type
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
 * @property string $approval_status
 * @property string|null $pdf_url
 * @property int|null $converted_sales_order_id
 * @property numeric $total_withholding_tax
 * @property numeric $grand_total_before_wht
 * @property string|null $source_type
 * @property int|null $source_reference_id
 * @property int|null $workflow_state_id
 * @property int|null $bank_account_id
 * @property-read \App\Models\User|null $approvedBy
 * @property-read \App\Models\CompanyBankAccount|null $bankAccount
 * @property-read \App\Models\LeadContact|null $contact
 * @property-read \App\Models\LeadSalesOrder|null $convertedSalesOrder
 * @property-read \App\Models\User|null $createdBy
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadQuotationItem> $items
 * @property-read int|null $items_count
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\User|null $presalesOwner
 * @property-read \App\Models\User|null $salesOwner
 * @property-read \App\Models\WorkflowState|null $workflowState
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereAcceptedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereApprovalStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereApprovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereBankAccountId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereBillingEntity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereBillingFrequency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereContactId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereContractEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereContractStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereConvertedSalesOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereCustomerName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereCustomerNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereDeliveryTimeline($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereExclusions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereExpectedCloseDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereForecastType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereGrandTotalBeforeWht($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereHeaderDiscountAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereHeaderDiscountType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereHeaderDiscountValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereInternalNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereOtherCost($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation wherePaymentTerms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation wherePdfUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation wherePresalesOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereProbability($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereQuotationDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereQuotationNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereQuotationStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereQuotationType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereRejectedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereSalesOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereScopeOfWork($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereSentAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereSourceReferenceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereSubtotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTaxAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTaxIncluded($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTermsConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTotalAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTotalLineDiscount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereTotalWithholdingTax($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereValidUntil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereWarrantySupportTerms($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadQuotation whereWorkflowStateId($value)
 * @mixin \Eloquent
 */
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
        'total_withholding_tax', 'grand_total_before_wht',

        // Source tracking
        'source_type', 'source_reference_id',

        // Custom Workflow tracking
        'workflow_state_id',

        // Bank Account selected
        'bank_account_id'
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

    public function bankAccount()
    {
        return $this->belongsTo(CompanyBankAccount::class, 'bank_account_id');
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

    public function workflowState()
    {
        return $this->belongsTo(WorkflowState::class, 'workflow_state_id');
    }
}
