<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $entity_type
 * @property int $entity_id
 * @property string|null $feature_key
 * @property string $title
 * @property string $category
 * @property string $severity
 * @property string|null $reason
 * @property array<array-key, mixed>|null $evidence_json
 * @property string|null $recommended_action
 * @property string $status
 * @property int|null $assigned_to
 * @property \Illuminate\Support\Carbon|null $due_date
 * @property int|null $created_by_ai_output_id
 * @property \Illuminate\Support\Carbon|null $resolved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignedTo
 * @property-read \App\Models\AiGeneratedOutput|null $createdByAiOutput
 * @property-read Model|\Eloquent $entity
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereAssignedTo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereCreatedByAiOutputId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereDueDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereEvidenceJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereFeatureKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereRecommendedAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereResolvedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereSeverity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiAttentionHighlight whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
