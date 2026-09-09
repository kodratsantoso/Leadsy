<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $sales_order_id
 * @property string $opportunity_type
 * @property \Illuminate\Support\Carbon $current_contract_end
 * @property string $urgency
 * @property int $days_until_expiration
 * @property int|null $recommended_product_id
 * @property numeric $estimated_value
 * @property string|null $reasoning
 * @property array<array-key, mixed>|null $pitch_talking_points
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead $lead
 * @property-read \App\Models\LeadSalesOrder $salesOrder
 * @property-read \App\Models\Product|null $recommendedProduct
 */
class CustomerRenewalOpportunity extends Model
{
    protected $fillable = [
        'lead_id',
        'sales_order_id',
        'opportunity_type',
        'current_contract_end',
        'urgency',
        'days_until_expiration',
        'recommended_product_id',
        'estimated_value',
        'reasoning',
        'pitch_talking_points',
        'status',
    ];

    protected $casts = [
        'current_contract_end' => 'date',
        'days_until_expiration' => 'integer',
        'estimated_value' => 'decimal:2',
        'pitch_talking_points' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function recommendedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'recommended_product_id');
    }
}
