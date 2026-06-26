<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductUpdateSuggestion extends Model
{
    protected $fillable = [
        'product_id', 'comparison_id', 'field_name',
        'current_value', 'suggested_value', 'change_type',
        'reason', 'status',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function comparison(): BelongsTo
    {
        return $this->belongsTo(ProductSpecificationComparison::class, 'comparison_id');
    }
}
