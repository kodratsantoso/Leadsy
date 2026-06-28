<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingSummaryDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'transcript_id',
        'lead_id',
        'file_name',
        'file_path',
        'file_url',
        'file_mime_type',
        'file_size',
        'generation_status',
        'generated_by',
        'generated_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    public function transcript(): BelongsTo
    {
        return $this->belongsTo(LeadTranscript::class, 'transcript_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
