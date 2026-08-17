<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property int $lead_id
 * @property string $analysis_type
 * @property array<array-key, mixed> $result_json
 * @property \Illuminate\Support\Carbon $created_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereAnalysisType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereResultJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAnalysisLog whereTenantId($value)
 * @mixin \Eloquent
 */
class LeadAnalysisLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'analysis_type',
        'result_json',
        'created_at',
    ];

    protected $casts = [
        'result_json' => 'array',
        'created_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
