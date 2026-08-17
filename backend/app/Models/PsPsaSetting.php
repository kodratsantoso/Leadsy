<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property numeric $hours_per_manday
 * @property bool $require_work_log_approval
 * @property bool $require_bast_before_project_close
 * @property bool $require_uat_signoff_before_bast
 * @property bool $require_handover_before_bast
 * @property bool $require_signed_sow_before_active
 * @property bool $require_sales_order_before_active
 * @property int $actual_md_watch_threshold_percentage
 * @property int $actual_md_at_risk_threshold_percentage
 * @property int $actual_md_overrun_threshold_percentage
 * @property int $blocked_task_alert_days
 * @property int $pending_change_request_alert_days
 * @property bool $allow_timesheet_on_unassigned_task
 * @property bool $allow_work_log_after_project_closed
 * @property bool $require_reason_for_task_reopen
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereActualMdAtRiskThresholdPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereActualMdOverrunThresholdPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereActualMdWatchThresholdPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereAllowTimesheetOnUnassignedTask($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereAllowWorkLogAfterProjectClosed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereBlockedTaskAlertDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereHoursPerManday($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting wherePendingChangeRequestAlertDays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireBastBeforeProjectClose($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireHandoverBeforeBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireReasonForTaskReopen($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireSalesOrderBeforeActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireSignedSowBeforeActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireUatSignoffBeforeBast($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereRequireWorkLogApproval($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsPsaSetting whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
