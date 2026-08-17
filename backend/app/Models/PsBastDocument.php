<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $bast_number
 * @property int $project_plan_id
 * @property int|null $lead_id
 * @property string|null $customer_name_snapshot
 * @property string|null $project_name
 * @property string|null $completion_summary
 * @property string|null $delivered_scope
 * @property string|null $pending_items
 * @property string|null $acceptance_date
 * @property string|null $customer_signer
 * @property string|null $internal_signer
 * @property string $status
 * @property int|null $document_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsDocument|null $document
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereAcceptanceDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereBastNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereCompletionSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereCustomerNameSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereCustomerSigner($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereDeliveredScope($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereInternalSigner($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument wherePendingItems($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereProjectName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsBastDocument whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsBastDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'bast_number',
        'project_plan_id',
        'lead_id',
        'customer_name_snapshot',
        'project_name',
        'completion_summary',
        'delivered_scope',
        'pending_items',
        'acceptance_date',
        'customer_signer',
        'internal_signer',
        'status',
        'document_id',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }

    public function document()
    {
        return $this->belongsTo(PsDocument::class, 'document_id');
    }
}
