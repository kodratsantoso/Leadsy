<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsWorkLog;
use App\Models\PsProjectTask;
use App\Models\PsProjectPlan;
use Illuminate\Support\Facades\DB;
use Exception;

class PsWorkLogService
{
    protected PsActualSummaryService $summaryService;
    protected PsPsaSettingService $settingService;

    public function __construct(PsActualSummaryService $summaryService, PsPsaSettingService $settingService)
    {
        $this->summaryService = $summaryService;
        $this->settingService = $settingService;
    }

    public function createWorkLog(array $data, int $userId): PsWorkLog
    {
        $settings = $this->settingService->getSettings();
        
        $plan = PsProjectPlan::findOrFail($data['project_plan_id']);
        if (in_array($plan->project_status, ['Closed', 'Cancelled', 'Archived']) && !$settings->allow_work_log_after_project_closed) {
            throw new Exception("Cannot log work against a closed project.");
        }

        if (empty($data['project_task_id']) && !$settings->allow_timesheet_on_unassigned_task) {
            throw new Exception("Work log must be assigned to a specific task.");
        }

        // Auto-calculate mandays if hours provided, or vice versa
        $hoursPerManday = $settings->hours_per_manday;
        if (!empty($data['work_hours']) && empty($data['actual_mandays'])) {
            $data['actual_mandays'] = round($data['work_hours'] / $hoursPerManday, 2);
        } elseif (!empty($data['actual_mandays']) && empty($data['work_hours'])) {
            $data['work_hours'] = round($data['actual_mandays'] * $hoursPerManday, 2);
        }

        $data['user_id'] = $userId;
        $data['created_by'] = $userId;
        $data['approval_status'] = $settings->require_work_log_approval ? 'Submitted' : 'Approved';
        $data['submitted_at'] = now();

        if ($data['approval_status'] === 'Approved') {
            $data['approved_by'] = $userId;
            $data['approved_at'] = now();
        }

        return DB::transaction(function () use ($data) {
            $workLog = PsWorkLog::create($data);
            $this->summaryService->calculateSummary($workLog->project_plan_id);
            return $workLog;
        });
    }

    public function approveWorkLog(int $workLogId, int $approverId): PsWorkLog
    {
        return DB::transaction(function () use ($workLogId, $approverId) {
            $workLog = PsWorkLog::findOrFail($workLogId);
            $workLog->update([
                'approval_status' => 'Approved',
                'approved_by' => $approverId,
                'approved_at' => now(),
            ]);

            $this->summaryService->calculateSummary($workLog->project_plan_id);
            return $workLog;
        });
    }

    public function rejectWorkLog(int $workLogId, int $approverId, string $reason): PsWorkLog
    {
        return DB::transaction(function () use ($workLogId, $approverId, $reason) {
            $workLog = PsWorkLog::findOrFail($workLogId);
            $workLog->update([
                'approval_status' => 'Rejected',
                'rejection_reason' => $reason,
                'updated_by' => $approverId,
            ]);

            $this->summaryService->calculateSummary($workLog->project_plan_id);
            return $workLog;
        });
    }
}
