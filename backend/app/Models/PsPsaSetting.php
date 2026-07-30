<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PsPsaSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'hours_per_manday',
        'require_work_log_approval',
        'require_bast_before_project_close',
        'require_uat_signoff_before_bast',
        'require_handover_before_bast',
        'require_signed_sow_before_active',
        'require_sales_order_before_active',
        'actual_md_watch_threshold_percentage',
        'actual_md_at_risk_threshold_percentage',
        'actual_md_overrun_threshold_percentage',
        'blocked_task_alert_days',
        'pending_change_request_alert_days',
        'allow_timesheet_on_unassigned_task',
        'allow_work_log_after_project_closed',
        'require_reason_for_task_reopen',
    ];
}
