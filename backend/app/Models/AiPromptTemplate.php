<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiPromptTemplate extends Model
{
    protected $fillable = [
        'feature_name',
        'template_name',
        'description',
        'is_active',
        'created_by',
        'updated_by',
        'active_version_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(AiPromptTemplateVersion::class, 'ai_prompt_template_id');
    }

    public function activeVersion(): BelongsTo
    {
        return $this->belongsTo(AiPromptTemplateVersion::class, 'active_version_id');
    }
}
