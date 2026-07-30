<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
