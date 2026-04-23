<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class QualificationWorkflow extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'slug', 'trigger_status', 'requires_approval',
        'override_enabled', 'sla_hours', 'is_active',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'override_enabled' => 'boolean',
        'sla_hours' => 'integer',
        'is_active' => 'boolean',
    ];

    public function stages(): HasMany
    {
        return $this->hasMany(QualificationWorkflowStage::class, 'workflow_id')->orderBy('sequence');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(QualificationWorkflowReview::class, 'workflow_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
