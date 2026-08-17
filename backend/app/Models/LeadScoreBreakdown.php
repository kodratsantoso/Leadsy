<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property int $lead_id
 * @property string $factor
 * @property string|null $value
 * @property numeric $weight
 * @property numeric $score_contribution
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereFactor($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereScoreContribution($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadScoreBreakdown whereWeight($value)
 * @mixin \Eloquent
 */
class LeadScoreBreakdown extends Model
{
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'factor',
        'value',
        'weight',
        'score_contribution',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'score_contribution' => 'decimal:2',
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
