<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
