<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProfessionalServices\PsPsaSettingService;
use Illuminate\Http\Request;

class PsPsaSettingsController extends Controller
{
    protected PsPsaSettingService $settingService;

    public function __construct(PsPsaSettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    public function show()
    {
        return response()->json($this->settingService->getSettings());
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'hours_per_manday' => 'numeric|min:1|max:24',
            'require_work_log_approval' => 'boolean',
            'require_bast_before_project_close' => 'boolean',
            'require_uat_signoff_before_bast' => 'boolean',
            'require_handover_before_bast' => 'boolean',
            'require_signed_sow_before_active' => 'boolean',
            'require_sales_order_before_active' => 'boolean',
            'actual_md_watch_threshold_percentage' => 'integer|min:0|max:200',
            'actual_md_at_risk_threshold_percentage' => 'integer|min:0|max:200',
            'actual_md_overrun_threshold_percentage' => 'integer|min:0|max:200',
            'blocked_task_alert_days' => 'integer|min:0',
            'pending_change_request_alert_days' => 'integer|min:0',
            'allow_timesheet_on_unassigned_task' => 'boolean',
            'allow_work_log_after_project_closed' => 'boolean',
            'require_reason_for_task_reopen' => 'boolean',
        ]);

        $settings = $this->settingService->updateSettings($validated);
        return response()->json($settings);
    }
}
