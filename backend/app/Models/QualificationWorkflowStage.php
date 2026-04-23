<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
