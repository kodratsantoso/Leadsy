<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
