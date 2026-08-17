<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property array<array-key, mixed> $questions
 * @property bool $ai_generated
 * @property string|null $ai_model
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $editor
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereAiGenerated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereQuestions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadBantcQuestionGuide whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class LeadBantcQuestionGuide extends Model
{
    protected $fillable = [
        'lead_id',
        'questions',
        'ai_generated',
        'ai_model',
        'updated_by',
    ];

    protected $casts = [
        'questions' => 'array',
        'ai_generated' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
