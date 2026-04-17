<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadProductMatch extends Model
{
    protected $fillable = [
        'lead_id', 'product_id', 'match_score', 'match_reason',
        'is_recommended', 'last_matched_at',
    ];

    protected $casts = [
        'match_score' => 'integer',
        'is_recommended' => 'boolean',
        'last_matched_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
