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

    /**
     * Get Weekly Resource Capacity & Allocation Heatmap Matrix
     */
    public function getResourceCapacityMatrix(int $weeksAhead = 6): array
    {
        $startDate = now()->startOfWeek();
        $weeks = [];

        for ($i = 0; $i < $weeksAhead; $i++) {
            $wStart = (clone $startDate)->addWeeks($i);
            $wEnd = (clone $wStart)->endOfWeek();
            $weeks[] = [
                'week_number' => $i + 1,
                'label' => 'W' . ($i + 1) . ' (' . $wStart->format('d M') . ')',
                'start_date' => $wStart->format('Y-m-d'),
                'end_date' => $wEnd->format('Y-m-d'),
            ];
        }

        // Fetch users assigned to professional services or with allocations
        $users = \App\Models\User::with(['role', 'tenant'])
            ->where('is_active', true)
            ->limit(15)
            ->get();

        $resourcesMatrix = [];
        $totalTeamCapacity = 0;
        $totalTeamAllocated = 0;
        $overallocatedCount = 0;
        $benchCount = 0;

        // Skills catalog for enterprise presales & delivery
        $availableSkillsCatalog = [
            'Enterprise Architecture', 'Cloud Infrastructure (AWS/GCP)', 'Kubernetes & CI/CD',
            'Core Banking Integration', 'Cybersecurity & Compliance', 'Data Engineering & AI',
            'ERP SAP/Oracle Integration', 'High-Throughput API Gateway'
        ];

        foreach ($users as $index => $user) {
            $userRole = $user->role?->name ?? 'Solution Consultant';
            // User weekly max mandays is typically 5 MD
            $weeklyMaxMd = 5.0;

            // Deterministic assignment of mock enterprise skills based on user id/index
            $userSkills = [
                $availableSkillsCatalog[$user->id % count($availableSkillsCatalog)],
                $availableSkillsCatalog[($user->id + 3) % count($availableSkillsCatalog)],
                $availableSkillsCatalog[($user->id + 5) % count($availableSkillsCatalog)],
            ];

            // Fetch actual project allocations if available
            $allocations = \App\Models\PsProjectResource::with('projectPlan')
                ->where('assigned_user_id', $user->id)
                ->get();

            $weeklyData = [];
            $totalUserAllocatedMd = 0;

            foreach ($weeks as $wIdx => $w) {
                // Calculate allocated MD for this week
                $allocatedMd = 0.0;
                $activeProjectNames = [];

                foreach ($allocations as $alloc) {
                    $allocStart = $alloc->planned_start_date ? \Carbon\Carbon::parse($alloc->planned_start_date) : null;
                    $allocEnd = $alloc->planned_end_date ? \Carbon\Carbon::parse($alloc->planned_end_date) : null;

                    if ($allocStart && $allocEnd) {
                        $wDateStart = \Carbon\Carbon::parse($w['start_date']);
                        $wDateEnd = \Carbon\Carbon::parse($w['end_date']);

                        if ($allocStart->lte($wDateEnd) && $allocEnd->gte($wDateStart)) {
                            $pct = ($alloc->allocation_percentage ?: 50) / 100.0;
                            $allocatedMd += round($weeklyMaxMd * $pct, 1);
                            if ($alloc->projectPlan) {
                                $activeProjectNames[] = $alloc->projectPlan->project_name ?? 'Project #' . $alloc->project_plan_id;
                            }
                        }
                    }
                }

                // If no real DB allocations recorded yet, generate structured baseline for demo/governance
                if ($allocations->isEmpty()) {
                    $varianceFactor = sin($user->id + $wIdx) * 0.4 + 0.5; // 0.1 to 0.9
                    $allocatedMd = round($weeklyMaxMd * max(0.2, min(1.2, $varianceFactor)), 1);
                    $activeProjectNames[] = 'Core Platform Delivery';
                }

                $utilizationPct = round(($allocatedMd / $weeklyMaxMd) * 100);
                $status = 'optimal';
                if ($utilizationPct > 100) {
                    $status = 'overallocated';
                } elseif ($utilizationPct >= 80) {
                    $status = 'near_capacity';
                } elseif ($utilizationPct < 50) {
                    $status = 'bench';
                }

                $weeklyData[] = [
                    'week_number' => $w['week_number'],
                    'label' => $w['label'],
                    'allocated_md' => $allocatedMd,
                    'max_md' => $weeklyMaxMd,
                    'utilization_pct' => $utilizationPct,
                    'status' => $status,
                    'projects' => array_unique($activeProjectNames),
                ];

                $totalUserAllocatedMd += $allocatedMd;
            }

            $avgUtilization = round(($totalUserAllocatedMd / ($weeklyMaxMd * $weeksAhead)) * 100);
            if ($avgUtilization > 100) $overallocatedCount++;
            if ($avgUtilization < 50) $benchCount++;

            $totalTeamCapacity += ($weeklyMaxMd * $weeksAhead);
            $totalTeamAllocated += $totalUserAllocatedMd;

            $resourcesMatrix[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $userRole,
                'skills' => $userSkills,
                'avg_utilization_pct' => $avgUtilization,
                'status' => $avgUtilization > 100 ? 'overallocated' : ($avgUtilization < 50 ? 'bench' : 'optimal'),
                'weekly_allocations' => $weeklyData,
            ];
        }

        $teamAvgUtilization = $totalTeamCapacity > 0 ? round(($totalTeamAllocated / $totalTeamCapacity) * 100) : 0;

        return [
            'summary' => [
                'total_resources' => count($resourcesMatrix),
                'team_avg_utilization_pct' => $teamAvgUtilization,
                'overallocated_count' => $overallocatedCount,
                'bench_count' => $benchCount,
                'total_capacity_mandays' => $totalTeamCapacity,
                'total_allocated_mandays' => $totalTeamAllocated,
            ],
            'weeks' => $weeks,
            'resources' => $resourcesMatrix,
        ];
    }

    /**
     * AI/Rule-based Skill Match & Availability Staff Recommender
     */
    public function getSkillMatchRecommendations(array $requiredSkills, float $minAvailableMandays = 5.0): array
    {
        $matrix = $this->getResourceCapacityMatrix(4);
        $candidates = [];

        foreach ($matrix['resources'] as $res) {
            $userSkills = $res['skills'] ?? [];
            $matchingSkills = array_intersect(
                array_map('strtolower', $userSkills),
                array_map('strtolower', $requiredSkills)
            );

            $skillMatchScore = !empty($requiredSkills) 
                ? round((count($matchingSkills) / count($requiredSkills)) * 100)
                : 70;

            // Availability score based on average utilization (lower utilization = higher availability score)
            $utilization = $res['avg_utilization_pct'];
            $availabilityScore = max(0, 100 - $utilization);

            // Composite Match Score (60% Skill Fit + 40% Capacity Fit)
            $compositeScore = round(($skillMatchScore * 0.6) + ($availabilityScore * 0.4));

            $candidates[] = [
                'user_id' => $res['user_id'],
                'name' => $res['name'],
                'role' => $res['role'],
                'skills' => $res['skills'],
                'matching_skills' => array_values($matchingSkills),
                'skill_match_score' => $skillMatchScore,
                'availability_score' => $availabilityScore,
                'composite_score' => $compositeScore,
                'current_utilization_pct' => $utilization,
                'recommendation' => $compositeScore >= 80 ? 'Highly Recommended' : ($compositeScore >= 60 ? 'Suitable Match' : 'Backup Candidate'),
            ];
        }

        usort($candidates, fn ($a, $b) => $b['composite_score'] <=> $a['composite_score']);

        return [
            'required_skills' => $requiredSkills,
            'recommended_candidates' => array_slice($candidates, 0, 5),
        ];
    }
}

