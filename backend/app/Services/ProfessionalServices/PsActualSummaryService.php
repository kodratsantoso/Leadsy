<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsProjectPlan;
use App\Models\PsProjectActualSummary;
use App\Models\PsWorkLog;
use App\Models\PsProjectTask;
use App\Models\PsEstimation;
use Illuminate\Support\Facades\DB;

class PsActualSummaryService
{
    protected PsPsaSettingService $settingService;

    public function __construct(PsPsaSettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    public function calculateSummary(int $projectPlanId): PsProjectActualSummary
    {
        return DB::transaction(function () use ($projectPlanId) {
            $plan = PsProjectPlan::with(['estimations', 'actualSummary'])->findOrFail($projectPlanId);
            
            // 1. Calculate Estimated & Planned Mandays
            // We get Estimated from the approved Estimation
            $estimation = $plan->estimations()->where('status', 'Approved')->latest()->first();
            $estimatedMandays = $estimation ? $estimation->total_mandays : 0;
            
            // Planned Mandays is the sum of tasks (could differ if modified)
            $plannedMandays = PsProjectTask::where('project_plan_id', $projectPlanId)
                ->sum('estimated_mandays');

            // 2. Aggregate Work Logs
            $workLogsQuery = PsWorkLog::where('project_plan_id', $projectPlanId);
            
            // Calculate submitted (including Draft & Submitted)
            $submittedMandays = (clone $workLogsQuery)
                ->whereIn('approval_status', ['Submitted', 'Draft', 'Approved'])
                ->sum('actual_mandays');
                
            $approvedMandays = (clone $workLogsQuery)
                ->where('approval_status', 'Approved')
                ->sum('actual_mandays');
            
            // 3. Compute Variances
            // We compare actuals against Planned ManDays (the active project plan)
            $varianceMandays = $plannedMandays - $approvedMandays;
            $variancePercentage = $plannedMandays > 0 ? (($approvedMandays - $plannedMandays) / $plannedMandays) * 100 : 0;
            
            $burnRate = $plannedMandays > 0 ? ($approvedMandays / $plannedMandays) * 100 : 0;
            $remainingMandays = max(0, $plannedMandays - $approvedMandays);

            // 4. Overrun Status Logic
            $settings = $this->settingService->getSettings();
            $status = 'On Track';
            
            if ($burnRate >= $settings->actual_md_overrun_threshold_percentage) {
                $status = 'Overrun';
            } elseif ($burnRate >= $settings->actual_md_at_risk_threshold_percentage) {
                $status = 'At Risk';
            } elseif ($burnRate >= $settings->actual_md_watch_threshold_percentage) {
                $status = 'Watch';
            }
            
            // 5. Update or Create Summary
            $summary = PsProjectActualSummary::updateOrCreate(
                ['project_plan_id' => $projectPlanId],
                [
                    'estimated_mandays' => $estimatedMandays,
                    'planned_mandays' => $plannedMandays,
                    'submitted_actual_mandays' => $submittedMandays,
                    'approved_actual_mandays' => $approvedMandays,
                    'remaining_mandays' => $remainingMandays,
                    'variance_mandays' => $varianceMandays,
                    'variance_percentage' => $variancePercentage,
                    'burn_rate' => $burnRate,
                    'overrun_status' => $status,
                ]
            );

            // Trigger risk updates if project is overrun
            if ($status === 'Overrun' || $status === 'At Risk') {
                $plan->update(['project_status' => 'At Risk']);
            }

            return $summary;
        });
    }
}
