<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadIcpConfig extends Model
{
    protected $table = 'lead_icp_config';

    protected $fillable = [
        'tenant_id',
        'industry',
        'size_range',
        'location',
        'priority_weight',
    ];

    protected $casts = [
        'priority_weight' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
