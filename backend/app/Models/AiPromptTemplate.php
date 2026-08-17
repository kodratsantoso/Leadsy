<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $feature_name
 * @property string $template_name
 * @property string|null $description
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property int|null $active_version_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AiPromptTemplateVersion|null $activeVersion
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AiPromptTemplateVersion> $versions
 * @property-read int|null $versions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereActiveVersionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereFeatureName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereTemplateName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplate whereUpdatedBy($value)
 * @mixin \Eloquent
 */
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
