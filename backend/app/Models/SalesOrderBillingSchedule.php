<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesOrderBillingSchedule extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'sales_order_billing_schedules';

    protected $fillable = [
        'sales_order_id',
        'term_number',
        'term_name',
        'trigger_type',
        'scheduled_date',
        'due_date',
        'percentage',
        'amount',
        'tax_amount',
        'withholding_tax_amount',
        'total_amount',
        'status',
        'commercial_invoice_id',
        'ps_document_id',
        'notes',
        'tenant_id',
    ];

    protected $casts = [
        'term_number' => 'integer',
        'scheduled_date' => 'date',
        'due_date' => 'date',
        'percentage' => 'float',
        'amount' => 'float',
        'tax_amount' => 'float',
        'withholding_tax_amount' => 'float',
        'total_amount' => 'float',
    ];

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(CommercialInvoice::class, 'commercial_invoice_id');
    }

    public function psDocument(): BelongsTo
    {
        return $this->belongsTo(PsDocument::class, 'ps_document_id');
    }
}
