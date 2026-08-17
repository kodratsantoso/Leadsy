<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $project_plan_number
 * @property int $estimation_id
 * @property int|null $lead_id
 * @property int|null $quotation_id
 * @property int|null $sales_order_id
 * @property string $project_name
 * @property string|null $customer_name_snapshot
 * @property string $project_status
 * @property \Illuminate\Support\Carbon|null $project_start_date
 * @property \Illuminate\Support\Carbon|null $target_go_live_date
 * @property \Illuminate\Support\Carbon|null $target_completion_date
 * @property int|null $estimated_duration_days
 * @property numeric $total_estimated_mandays
 * @property int|null $service_category_id
 * @property int|null $estimation_template_id
 * @property int|null $complexity_level_id
 * @property int|null $project_manager_id
 * @property int|null $solution_architect_id
 * @property int|null $main_consultant_id
 * @property string|null $delivery_notes
 * @property string|null $risk_summary
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsBastDocument> $bastDocuments
 * @property-read int|null $bast_documents_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsChangeRequest> $changeRequests
 * @property-read int|null $change_requests_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectDeliveryChecklist> $deliveryChecklists
 * @property-read int|null $delivery_checklists_count
 * @property-read \App\Models\PsEstimation $estimation
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsEstimation> $estimations
 * @property-read int|null $estimations_count
 * @property-read \App\Models\Lead|null $lead
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectMilestone> $milestones
 * @property-read int|null $milestones_count
 * @property-read \App\Models\User|null $projectManager
 * @property-read \App\Models\LeadQuotation|null $quotation
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectReadinessItem> $readinessItems
 * @property-read int|null $readiness_items_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectResource> $resources
 * @property-read int|null $resources_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectRisk> $risks
 * @property-read int|null $risks_count
 * @property-read \App\Models\LeadSalesOrder|null $salesOrder
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsProjectTask> $tasks
 * @property-read int|null $tasks_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\PsWorkLog> $workLogs
 * @property-read int|null $work_logs_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereComplexityLevelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereCustomerNameSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereDeliveryNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereEstimatedDurationDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereEstimationTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereMainConsultantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereProjectManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereProjectName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereProjectPlanNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereProjectStartDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereProjectStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereQuotationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereRiskSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereSalesOrderId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereServiceCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereSolutionArchitectId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereTargetCompletionDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereTargetGoLiveDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereTotalEstimatedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsProjectPlan whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class PsProjectPlan extends Model
{
    use HasFactory;

    protected $table = 'ps_project_plans';

    protected $fillable = [
        'project_plan_number',
        'estimation_id',
        'lead_id',
        'quotation_id',
        'sales_order_id',
        'project_name',
        'customer_name_snapshot',
        'project_status',
        'project_start_date',
        'target_go_live_date',
        'target_completion_date',
        'estimated_duration_days',
        'total_estimated_mandays',
        'service_category_id',
        'estimation_template_id',
        'complexity_level_id',
        'project_manager_id',
        'solution_architect_id',
        'main_consultant_id',
        'delivery_notes',
        'risk_summary',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'project_start_date' => 'date',
            'target_go_live_date' => 'date',
            'target_completion_date' => 'date',
            'total_estimated_mandays' => 'decimal:2',
        ];
    }

    public function estimation(): BelongsTo { return $this->belongsTo(PsEstimation::class, 'estimation_id'); }
    public function lead(): BelongsTo { return $this->belongsTo(Lead::class, 'lead_id'); }
    public function quotation(): BelongsTo { return $this->belongsTo(LeadQuotation::class, 'quotation_id'); }
    public function salesOrder(): BelongsTo { return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id'); }
    
    public function tasks(): HasMany { return $this->hasMany(PsProjectTask::class, 'project_plan_id')->orderBy('sort_order'); }
    public function milestones(): HasMany { return $this->hasMany(PsProjectMilestone::class, 'project_plan_id')->orderBy('planned_date')->orderBy('sort_order'); }
    public function resources(): HasMany { return $this->hasMany(PsProjectResource::class, 'project_plan_id'); }
    public function deliveryChecklists(): HasMany { return $this->hasMany(PsProjectDeliveryChecklist::class, 'project_plan_id'); }
    public function estimations(): HasMany { return $this->hasMany(PsEstimation::class, 'project_plan_id'); }
    public function workLogs(): HasMany { return $this->hasMany(PsWorkLog::class, 'project_plan_id'); }
    public function actualSummary(): HasOne { return $this->hasOne(PsProjectActualSummary::class, 'project_plan_id'); }
    public function changeRequests(): HasMany { return $this->hasMany(PsChangeRequest::class, 'project_plan_id'); }
    public function bastDocuments(): HasMany { return $this->hasMany(PsBastDocument::class, 'project_plan_id'); }
    public function postImplementationReview(): HasOne { return $this->hasOne(PsPostImplementationReview::class, 'project_plan_id'); }
    public function risks(): HasMany { return $this->hasMany(PsProjectRisk::class, 'project_plan_id'); }
    public function readinessItems(): HasMany { return $this->hasMany(PsProjectReadinessItem::class, 'project_plan_id')->orderBy('sort_order'); }
    
    public function projectManager(): BelongsTo { return $this->belongsTo(User::class, 'project_manager_id'); }
}
