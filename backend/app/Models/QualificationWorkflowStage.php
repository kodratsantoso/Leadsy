<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $workflow_id
 * @property string $code
 * @property string $label
 * @property int $sequence
 * @property string|null $assigned_role
 * @property string $decision_type
 * @property bool $is_required
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\QualificationWorkflow|null $workflow
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereAssignedRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereDecisionType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereIsRequired($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereSequence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|QualificationWorkflowStage whereWorkflowId($value)
 * @mixin \Eloquent
 */
class QualificationWorkflowStage extends Model
{
    protected $fillable = [
        'workflow_id', 'code', 'label', 'sequence',
        'assigned_role', 'decision_type', 'is_required', 'metadata',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'is_required' => 'boolean',
        'metadata' => 'array',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(QualificationWorkflow::class, 'workflow_id');
    }
}
