<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
