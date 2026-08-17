<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $ai_output_id
 * @property int $version_number
 * @property array<array-key, mixed>|null $output_json
 * @property string|null $change_summary
 * @property int|null $changed_by
 * @property string $change_type
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\AiGeneratedOutput $aiOutput
 * @property-read \App\Models\User|null $changedBy
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereAiOutputId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereChangeSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereChangeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereChangedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereOutputJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AiOutputVersion whereVersionNumber($value)
 * @mixin \Eloquent
 */
class AiOutputVersion extends Model
{
    protected $fillable = [
        'ai_output_id', 'version_number', 'output_json',
        'change_summary', 'changed_by', 'change_type',
    ];

    protected $casts = [
        'output_json' => 'array',
    ];

    public function aiOutput(): BelongsTo
    {
        return $this->belongsTo(AiGeneratedOutput::class, 'ai_output_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
