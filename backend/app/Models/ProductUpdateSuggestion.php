<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property int $comparison_id
 * @property string $field_name
 * @property string|null $current_value
 * @property string|null $suggested_value
 * @property string $change_type
 * @property string|null $reason
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\ProductSpecificationComparison $comparison
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereChangeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereComparisonId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereCurrentValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereFieldName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereSuggestedValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductUpdateSuggestion whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
