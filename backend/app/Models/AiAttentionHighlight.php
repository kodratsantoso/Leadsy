<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAttentionHighlight extends Model
{
    protected $fillable = [
        'entity_type', 'entity_id', 'feature_key',
        'title', 'category', 'severity', 'reason',
        'evidence_json', 'recommended_action', 'status',
        'assigned_to', 'due_date', 'created_by_ai_output_id',
        'resolved_at',
    ];

    protected $casts = [
        'evidence_json' => 'array',
        'due_date' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdByAiOutput(): BelongsTo
    {
        return $this->belongsTo(AiGeneratedOutput::class, 'created_by_ai_output_id');
    }
}
