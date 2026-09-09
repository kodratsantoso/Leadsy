<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $sales_order_id
 * @property string $title
 * @property string|null $description
 * @property int $sequence
 * @property \Illuminate\Support\Carbon|null $target_date
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property string $status
 * @property int|null $owner_id
 * @property array<array-key, mixed>|null $deliverables
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead $lead
 * @property-read \App\Models\LeadSalesOrder|null $salesOrder
 * @property-read \App\Models\User|null $owner
 */
class CustomerOnboardingMilestone extends Model
{
    protected $fillable = [
        'lead_id',
        'sales_order_id',
        'title',
        'description',
        'sequence',
        'target_date',
        'completed_at',
        'status',
        'owner_id',
        'deliverables',
    ];

    protected $casts = [
        'sequence' => 'integer',
        'target_date' => 'date',
        'completed_at' => 'datetime',
        'deliverables' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
