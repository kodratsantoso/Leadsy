<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductTier extends Model
{
    protected $fillable = [
        'product_id',
        'name',
        'price',
        'pricing_type',
        'billing_period',
        'subscription_duration_value',
        'subscription_duration_unit',
        'features',
        'status',
    ];

    protected $casts = [
        'features' => 'array',
        'price' => 'double',
        'subscription_duration_value' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
