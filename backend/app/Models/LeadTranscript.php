<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class LeadTranscript extends Model
{
    protected $fillable = [
        'lead_id', 'activity_id', 'title', 'source_type', 'source_id',
        'transcript_text', 'file_path', 'file_name', 'file_mime', 'file_size',
        'recorded_at', 'evaluation_status',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(LeadActivity::class, 'activity_id');
    }

    public function evaluations(): MorphMany
    {
        return $this->morphMany(LeadAiEvaluation::class, 'source');
    }

    public function activities(): MorphMany
    {
        return $this->morphMany(LeadActivity::class, 'related_entity');
    }
}
