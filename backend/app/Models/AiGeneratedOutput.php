<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $entity_type
 * @property int $entity_id
 * @property string $feature_key
 * @property array<array-key, mixed>|null $original_output_json
 * @property array<array-key, mixed>|null $edited_output_json
 * @property array<array-key, mixed>|null $current_output_json
 * @property string $status
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property string|null $prompt_version
 * @property int|null $generated_by
 * @property int|null $reviewed_by
 * @property int|null $last_edited_by
 * @property \Illuminate\Support\Carbon|null $generated_at
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Model|\Eloquent $entity
 * @property-read \App\Models\User|null $generatedBy
 * @property-read \App\Models\User|null $lastEditedBy
 * @property-read \App\Models\User|null $reviewedBy
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AiOutputVersion> $versions
 * @property-read int|null $versions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereAiProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereCurrentOutputJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereEditedOutputJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereFeatureKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereGeneratedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereLastEditedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereOriginalOutputJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput wherePromptVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiGeneratedOutput whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class AiGeneratedOutput extends Model
{
    protected $fillable = [
        'entity_type', 'entity_id', 'feature_key',
        'original_output_json', 'edited_output_json', 'current_output_json',
        'status', 'ai_provider', 'ai_model', 'prompt_version',
        'generated_by', 'reviewed_by', 'last_edited_by',
        'generated_at', 'reviewed_at',
    ];

    protected $casts = [
        'original_output_json' => 'array',
        'edited_output_json' => 'array',
        'current_output_json' => 'array',
        'generated_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    public function versions(): HasMany
    {
        return $this->hasMany(AiOutputVersion::class, 'ai_output_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function lastEditedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_edited_by');
    }
}
