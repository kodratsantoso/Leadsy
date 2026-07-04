<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdxCompanyCache extends Model
{
    protected $fillable = [
        'idx_code', 'company_name', 'industry', 'sub_industry', 'sector',
        'listing_board', 'website', 'phone', 'email', 'address',
        'raw_payload_json', 'last_fetched_at'
    ];

    protected $casts = [
        'raw_payload_json' => 'array',
        'last_fetched_at' => 'datetime',
    ];
}
