<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property string|null $review_date
 * @property int|null $reviewer_id
 * @property string|null $what_went_well
 * @property string|null $what_could_be_improved
 * @property string|null $estimation_accuracy_notes
 * @property string|null $actual_vs_estimated_summary
 * @property string|null $customer_feedback
 * @property string|null $internal_feedback
 * @property string|null $reusable_template_suggestion
 * @property string|null $future_upsell_opportunity
 * @property string $review_status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\User|null $reviewer
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereActualVsEstimatedSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereCustomerFeedback($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereEstimationAccuracyNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereFutureUpsellOpportunity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereInternalFeedback($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereReusableTemplateSuggestion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereReviewDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereReviewStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereReviewerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereWhatCouldBeImproved($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPostImplementationReview whereWhatWentWell($value)
 * @mixin \Eloquent
 */
class PsPostImplementationReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_plan_id',
        'review_date',
        'reviewer_id',
        'what_went_well',
        'what_could_be_improved',
        'estimation_accuracy_notes',
        'actual_vs_estimated_summary',
        'customer_feedback',
        'internal_feedback',
        'reusable_template_suggestion',
        'future_upsell_opportunity',
        'review_status',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
