<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $source_type
 * @property int|null $source_id
 * @property string|null $transcript_text
 * @property \Illuminate\Support\Carbon $recorded_at
 * @property string $evaluation_status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $activity_id
 * @property string|null $title
 * @property string|null $file_path
 * @property string|null $file_name
 * @property string|null $file_mime
 * @property int|null $file_size
 * @property string|null $meeting_type
 * @property string|null $summary_type
 * @property array<array-key, mixed>|null $general_sections_json
 * @property array<array-key, mixed>|null $meeting_type_sections_json
 * @property array<array-key, mixed>|null $bantc_json
 * @property array<array-key, mixed>|null $score_updates_json
 * @property string|null $presales_recommendation
 * @property string|null $prompt_template_key
 * @property string|null $prompt_version
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property \Illuminate\Support\Carbon|null $generated_at
 * @property string|null $source_provider
 * @property string|null $source_url
 * @property string|null $meeting_id
 * @property string|null $minute_token
 * @property string|null $recording_url
 * @property string|null $transcript_hash
 * @property string|null $import_status
 * @property string|null $import_error_code
 * @property string|null $import_error_message
 * @property string|null $imported_at
 * @property array<array-key, mixed>|null $detailed_insights_json
 * @property array<array-key, mixed>|null $conclusion_section_json
 * @property string|null $lark_doc_url
 * @property string|null $lark_doc_id
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadActivity> $activities
 * @property-read int|null $activities_count
 * @property-read \App\Models\LeadActivity|null $activity
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\MeetingSummaryDocument> $documents
 * @property-read int|null $documents_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadAiEvaluation> $evaluations
 * @property-read int|null $evaluations_count
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LarkBaseSyncJob> $syncJobs
 * @property-read int|null $sync_jobs_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereActivityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereAiProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereBantcJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereConclusionSectionJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereDetailedInsightsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereEvaluationStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereFileMime($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereFileName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereFilePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereFileSize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereGeneralSectionsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereImportErrorCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereImportErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereImportStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereImportedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereLarkDocId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereLarkDocUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereMeetingId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereMeetingType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereMeetingTypeSectionsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereMinuteToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript wherePresalesRecommendation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript wherePromptTemplateKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript wherePromptVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereRecordedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereRecordingUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereScoreUpdatesJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereSourceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereSourceProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereSourceUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereSummaryType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereTranscriptHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereTranscriptText($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadTranscript whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadTranscript extends Model
{
    protected $fillable = [
        'lead_id', 'activity_id', 'title', 'source_type', 'source_id',
        'transcript_text', 'file_path', 'file_name', 'file_mime', 'file_size',
        'recorded_at', 'evaluation_status',
        'meeting_type', 'summary_type', 'general_sections_json', 'meeting_type_sections_json',
        'detailed_insights_json', 'conclusion_section_json',
        'bantc_json', 'score_updates_json', 'presales_recommendation',
        'prompt_template_key', 'prompt_version', 'ai_provider', 'ai_model', 'generated_at',
        
        // Lark Import Fields
        'source_provider', 'source_url', 'meeting_id', 'minute_token', 'recording_url',
        'transcript_hash', 'import_status', 'import_error_code', 'import_error_message', 'imported_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'generated_at' => 'datetime',
        'general_sections_json' => 'array',
        'meeting_type_sections_json' => 'array',
        'detailed_insights_json' => 'array',
        'conclusion_section_json' => 'array',
        'bantc_json' => 'array',
        'score_updates_json' => 'array',
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

    public function documents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MeetingSummaryDocument::class, 'transcript_id');
    }

    public function syncJobs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\LarkBaseSyncJob::class, 'transcript_id');
    }
}
