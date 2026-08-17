<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property string $name
 * @property float $price
 * @property string $pricing_type
 * @property string $billing_period
 * @property int $subscription_duration_value
 * @property string $subscription_duration_unit
 * @property array<array-key, mixed>|null $features
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereBillingPeriod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereFeatures($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier wherePrice($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier wherePricingType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereSubscriptionDurationUnit($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereSubscriptionDurationValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductTier whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
