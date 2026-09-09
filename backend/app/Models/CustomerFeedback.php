<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $contact_id
 * @property int|null $sales_order_id
 * @property string $survey_type
 * @property int $score
 * @property string $category
 * @property string|null $feedback_text
 * @property string $sentiment
 * @property bool $action_required
 * @property \Illuminate\Support\Carbon|null $resolved_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead $lead
 * @property-read \App\Models\LeadContact|null $contact
 * @property-read \App\Models\LeadSalesOrder|null $salesOrder
 */
class CustomerFeedback extends Model
{
    protected $table = 'customer_feedbacks';

    protected $fillable = [
        'lead_id',
        'contact_id',
        'sales_order_id',
        'survey_type',
        'score',
        'category',
        'feedback_text',
        'sentiment',
        'action_required',
        'resolved_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'action_required' => 'boolean',
        'resolved_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(LeadContact::class, 'contact_id');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }
}
