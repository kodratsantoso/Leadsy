<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $ai_prompt_template_id
 * @property int $version
 * @property string|null $content
 * @property bool $is_active
 * @property bool $is_enabled
 * @property int|null $created_by
 * @property int|null $activated_by
 * @property \Illuminate\Support\Carbon|null $activated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $system_prompt
 * @property string|null $user_prompt
 * @property array<array-key, mixed>|null $output_contract_json
 * @property array<array-key, mixed>|null $variables_schema_json
 * @property-read \App\Models\User|null $activator
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\AiPromptTemplate $template
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereActivatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereActivatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereAiPromptTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereContent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereIsEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereOutputContractJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereSystemPrompt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereUserPrompt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereVariablesSchemaJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiPromptTemplateVersion whereVersion($value)
 * @mixin \Eloquent
 */
class AiPromptTemplateVersion extends Model
{
    protected $fillable = [
        'ai_prompt_template_id',
        'version',
        'content',
        'system_prompt',
        'user_prompt',
        'output_contract_json',
        'variables_schema_json',
        'is_active',
        'is_enabled',
        'created_by',
        'activated_by',
        'activated_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_enabled' => 'boolean',
        'activated_at' => 'datetime',
        'output_contract_json' => 'array',
        'variables_schema_json' => 'array',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(AiPromptTemplate::class, 'ai_prompt_template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }
}
