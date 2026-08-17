<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $outcome
 * @property float|null $deal_size
 * @property string|null $loss_reason
 * @property string|null $loss_category
 * @property string|null $feedback_notes
 * @property int|null $closed_by
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $product_id
 * @property string $sale_type
 * @property-read \App\Models\User|null $closedBy
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product|null $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereClosedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereClosedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereDealSize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereFeedbackNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereLossCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereLossReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereOutcome($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereSaleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadOutcome whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadOutcome extends Model
{
    protected $fillable = [
        'lead_id', 'product_id', 'outcome', 'sale_type', 'deal_size',
        'loss_reason', 'loss_category', 'feedback_notes',
        'closed_by', 'closed_at',
    ];

    protected $casts = [
        'deal_size' => 'float',
        'closed_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
