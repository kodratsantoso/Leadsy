<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FakturPajak extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'faktur_pajaks';

    protected $fillable = [
        'commercial_invoice_id',
        'nsfp_number',
        'tax_period_month',
        'tax_period_year',
        'transaction_code',
        'faktur_date',
        'seller_name',
        'seller_npwp',
        'seller_address',
        'buyer_name',
        'buyer_npwp',
        'buyer_nik',
        'buyer_address',
        'dpp_amount',
        'ppn_percentage',
        'ppn_amount',
        'ppnbm_amount',
        'status',
        'approval_code',
        'pdf_path',
        'created_by',
        'tenant_id',
    ];

    protected $casts = [
        'tax_period_month' => 'integer',
        'tax_period_year' => 'integer',
        'faktur_date' => 'date',
        'dpp_amount' => 'float',
        'ppn_percentage' => 'float',
        'ppn_amount' => 'float',
        'ppnbm_amount' => 'float',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(CommercialInvoice::class, 'commercial_invoice_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
