<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommercialInvoice extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'commercial_invoices';

    protected $fillable = [
        'invoice_number',
        'lead_id',
        'quotation_id',
        'sales_order_id',
        'ps_document_id',
        'milestone_name',
        'milestone_percentage',
        'subtotal',
        'tax_percentage',
        'tax_amount',
        'withholding_tax_percentage',
        'withholding_tax_amount',
        'total_amount',
        'currency',
        'status',
        'invoice_date',
        'due_date',
        'payment_terms',
        'bank_details',
        'notes',
        'pdf_path',
        'paid_amount',
        'paid_at',
        'created_by',
        'tenant_id',
    ];

    protected $casts = [
        'milestone_percentage' => 'float',
        'subtotal' => 'float',
        'tax_percentage' => 'float',
        'tax_amount' => 'float',
        'withholding_tax_percentage' => 'float',
        'withholding_tax_amount' => 'float',
        'total_amount' => 'float',
        'paid_amount' => 'float',
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(LeadQuotation::class, 'quotation_id');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function psDocument(): BelongsTo
    {
        return $this->belongsTo(PsDocument::class, 'ps_document_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CommercialInvoiceItem::class, 'commercial_invoice_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
