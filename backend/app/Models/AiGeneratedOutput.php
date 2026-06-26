<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
