<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
