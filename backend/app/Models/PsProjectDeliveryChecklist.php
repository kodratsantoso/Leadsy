<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $project_plan_id
 * @property string $checklist_type
 * @property \Illuminate\Support\Carbon|null $planned_start_date
 * @property \Illuminate\Support\Carbon|null $planned_end_date
 * @property int|null $owner_id
 * @property string|null $scope_notes
 * @property array<array-key, mixed>|null $checklist_items
 * @property string $status
 * @property string|null $general_notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $actual_start_date
 * @property \Illuminate\Support\Carbon|null $actual_end_date
 * @property int $issues_count
 * @property bool $sign_off_status
 * @property int|null $sign_off_document_id
 * @property string|null $customer_pic
 * @property-read \App\Models\User|null $owner
 * @property-read \App\Models\PsProjectPlan $projectPlan
 * @property-read \App\Models\PsDocument|null $signOffDocument
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereActualEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereActualStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereChecklistItems($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereChecklistType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereCustomerPic($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereGeneralNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereIssuesCount($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereOwnerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist wherePlannedEndDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist wherePlannedStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereProjectPlanId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereScopeNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereSignOffDocumentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereSignOffStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectDeliveryChecklist whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsProjectDeliveryChecklist extends Model
{
    use HasFactory;

    protected $table = 'ps_project_delivery_checklists';

    protected $fillable = [
        'project_plan_id',
        'checklist_type',
        'planned_start_date',
        'planned_end_date',
        'owner_id',
        'scope_notes',
        'checklist_items',
        'status',
        'general_notes',
        'actual_start_date',
        'actual_end_date',
        'issues_count',
        'sign_off_status',
        'sign_off_document_id',
        'customer_pic',
    ];

    protected function casts(): array
    {
        return [
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'checklist_items' => 'array',
            'actual_start_date' => 'date',
            'actual_end_date' => 'date',
            'sign_off_status' => 'boolean',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function signOffDocument(): BelongsTo { return $this->belongsTo(PsDocument::class, 'sign_off_document_id'); }
}
