<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $transcript_id
 * @property int|null $lead_id
 * @property string|null $file_name
 * @property string|null $file_path
 * @property string|null $file_url
 * @property string|null $file_mime_type
 * @property int|null $file_size
 * @property string $generation_status
 * @property string|null $generated_by
 * @property \Illuminate\Support\Carbon|null $generated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\LeadTranscript|null $transcript
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereFileMimeType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereFileName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereFileSize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereFileUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereGeneratedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereGenerationStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereTranscriptId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|MeetingSummaryDocument whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
