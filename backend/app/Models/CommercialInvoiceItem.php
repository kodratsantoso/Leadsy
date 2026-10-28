<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommercialInvoiceItem extends Model
{
    use HasFactory;

    protected $table = 'commercial_invoice_items';

    protected $fillable = [
        'commercial_invoice_id',
        'item_description',
        'quantity',
        'unit',
        'unit_price',
        'amount',
    ];

    protected $casts = [
        'quantity' => 'float',
        'unit_price' => 'float',
        'amount' => 'float',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(CommercialInvoice::class, 'commercial_invoice_id');
    }
}
