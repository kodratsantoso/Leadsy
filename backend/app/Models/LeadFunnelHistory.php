<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $from_stage_id
 * @property int|null $to_stage_id
 * @property int|null $moved_by
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\FunnelStage|null $fromStage
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\User|null $movedBy
 * @property-read \App\Models\FunnelStage|null $toStage
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereFromStageId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereMovedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereToStageId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadFunnelHistory whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadFunnelHistory extends Model
{
    protected $table = 'lead_funnel_history';

    protected $fillable = [
        'lead_id', 'from_stage_id', 'to_stage_id', 'moved_by', 'notes',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function fromStage(): BelongsTo
    {
        return $this->belongsTo(FunnelStage::class, 'from_stage_id');
    }

    public function toStage(): BelongsTo
    {
        return $this->belongsTo(FunnelStage::class, 'to_stage_id');
    }

    public function movedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moved_by');
    }
}
