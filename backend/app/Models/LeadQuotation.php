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
        'sent_at', 'accepted_at', 'rejected_at'
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
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
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
}
