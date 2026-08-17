<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $entity_type
 * @property int $entity_id
 * @property string $confidentiality_level
 * @property int $score
 * @property string $assessment_method
 * @property array<array-key, mixed>|null $score_breakdown_json
 * @property array<array-key, mixed>|null $data_sources_json
 * @property array<array-key, mixed>|null $missing_data_json
 * @property array<array-key, mixed>|null $recommendation_json
 * @property string|null $confidence_score
 * @property string $status
 * @property int|null $assessed_by
 * @property int|null $reviewed_by
 * @property \Illuminate\Support\Carbon|null $assessed_at
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Model|\Eloquent $entity
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereAssessedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereAssessedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereAssessmentMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereConfidentialityLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereDataSourcesJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereEntityId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereEntityType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereMissingDataJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereRecommendationJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereScoreBreakdownJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ConfidentialityAssessment whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class ConfidentialityAssessment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'score_breakdown_json' => 'array',
        'data_sources_json' => 'array',
        'missing_data_json' => 'array',
        'recommendation_json' => 'array',
        'assessed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }
}
