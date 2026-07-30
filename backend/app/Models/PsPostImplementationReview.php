<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
