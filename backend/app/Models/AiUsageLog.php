<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'action',
        'provider',
        'model',
        'tokens_prompt',
        'tokens_completion',
        'tokens_total',
        'estimated_cost_usd',
        'has_web_search',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'has_web_search' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
