<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsProjectPlan;
use App\Models\PsProjectActualSummary;
use App\Models\PsWorkLog;
use Illuminate\Support\Facades\DB;

class PsPsaDashboardService
{
    public function getDashboardMetrics(): array
    {
        $activeProjectsCount = PsProjectPlan::whereIn('project_status', ['In Progress', 'At Risk', 'UAT', 'Go-Live', 'Hypercare'])->count();
        $completedProjectsCount = PsProjectPlan::where('project_status', 'Completed')->count();
        $overrunProjectsCount = PsProjectActualSummary::where('overrun_status', 'Overrun')->count();
        
        $totalEstimatedMandays = PsProjectActualSummary::sum('estimated_mandays');
        $totalApprovedMandays = PsProjectActualSummary::sum('approved_actual_mandays');
        
        $varianceTotal = $totalApprovedMandays - $totalEstimatedMandays;
        $variancePercentage = $totalEstimatedMandays > 0 ? ($varianceTotal / $totalEstimatedMandays) * 100 : 0;

        // Resource Utilization (Lite) - total hours logged this month
        $thisMonthLogs = PsWorkLog::whereMonth('work_date', date('m'))
            ->whereYear('work_date', date('Y'))
            ->where('approval_status', 'Approved')
            ->sum('actual_mandays');

        // Recent Projects Health List
        $recentProjects = PsProjectPlan::with('actualSummary')
            ->whereIn('project_status', ['In Progress', 'At Risk'])
            ->orderBy('updated_at', 'desc')
            ->take(5)
            ->get();

        return [
            'metrics' => [
                'active_projects' => $activeProjectsCount,
                'completed_projects' => $completedProjectsCount,
                'overrun_projects' => $overrunProjectsCount,
                'total_estimated_mandays' => $totalEstimatedMandays,
                'total_actual_mandays' => $totalApprovedMandays,
                'variance_percentage' => round($variancePercentage, 2),
                'this_month_utilized_mandays' => $thisMonthLogs,
            ],
            'recent_projects' => $recentProjects,
        ];
    }
}
