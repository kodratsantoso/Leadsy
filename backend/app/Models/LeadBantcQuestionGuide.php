<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'questions'    => 'array',
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
