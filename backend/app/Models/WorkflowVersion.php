<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowVersion extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workflow_definition_id', 'version_number', 'is_active', 'is_testing',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_testing' => 'boolean',
        'version_number' => 'integer',
    ];

    public function definition(): BelongsTo
    {
        return $this->belongsTo(WorkflowDefinition::class, 'workflow_definition_id');
    }

    public function states(): HasMany
    {
        return $this->hasMany(WorkflowState::class);
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
