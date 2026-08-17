<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $quotation_id
 * @property int|null $product_id
 * @property numeric $amount
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $confirmed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product|null $product
 * @property-read \App\Models\Quotation|null $quotation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereAmount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereConfirmedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|SalesOrder whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class SalesOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'quotation_id',
        'product_id',
        'amount',
        'status',
        'confirmed_at'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'confirmed_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
