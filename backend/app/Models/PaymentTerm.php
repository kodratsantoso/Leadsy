<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTerm extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'payment_terms';

    protected $fillable = [
        'name',
        'code',
        'term_type',
        'days_due',
        'frequency',
        'description',
        'installments_config',
        'is_active',
        'tenant_id',
    ];

    protected $casts = [
        'days_due' => 'integer',
        'installments_config' => 'array',
        'is_active' => 'boolean',
    ];
}
