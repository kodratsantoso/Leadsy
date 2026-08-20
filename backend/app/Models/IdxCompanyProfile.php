<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdxCompanyProfile extends Model
{
    protected $fillable = [
        'lead_id',
        'ticker',
        'isin',
        'listing_date',
        'listing_status',
        'sector',
        'sub_sector',
        'shares_outstanding',
        'controlling_shareholder',
        'raw_payload_json',
    ];

    protected $casts = [
        'listing_date' => 'date',
        'shares_outstanding' => 'integer',
        'raw_payload_json' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
