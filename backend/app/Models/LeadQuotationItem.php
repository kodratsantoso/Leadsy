<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadQuotationItem extends Model
{
    protected $fillable = [
        'quotation_id', 'product_id', 'item_name', 'description',
        'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'total_amount',
        'billing_period', 'start_date', 'end_date'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function quotation()
    {
        return $this->belongsTo(LeadQuotation::class, 'quotation_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
