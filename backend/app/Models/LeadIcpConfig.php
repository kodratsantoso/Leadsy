<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property string $industry
 * @property string|null $size_range
 * @property string|null $location
 * @property numeric $priority_weight
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereLocation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig wherePriorityWeight($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereSizeRange($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadIcpConfig whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
