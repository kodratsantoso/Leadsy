<?php

namespace App\Services\Analytics;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use App\Models\KpiDefinition;
use App\Models\UserKpiTarget;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RoleKpiCalculationService
{
    /**
     * Calculate KPI metrics for a given user and period.
     */
    public function calculateForUser(User $user, string $period = 'month'): array
    {
        $roleSlug = $this->determineRoleCategory($user);
        
        // Fetch active KPI definitions for this role
        $definitions = KpiDefinition::where('role_slug', $roleSlug)
            ->where('is_active', true)
            ->get();

        if ($definitions->isEmpty()) {
            return [
                'role_category' => $roleSlug,
                'metrics' => [],
            ];
        }

        // Fetch user targets for this period
        $targets = UserKpiTarget::where('user_id', $user->id)
            ->where('period_type', $period)
            ->pluck('target_value', 'kpi_key');

        $metrics = [];
        $dateRange = $this->getDateRange($period);

        foreach ($definitions as $def) {
            $actual = $this->calculateActual($user, $roleSlug, $def->kpi_key, $dateRange);
            $target = $targets->get($def->kpi_key);
            
            $achievement = null;
            if ($target !== null && $target > 0) {
                $achievement = min(200, round(($actual / $target) * 100, 1));
            }

            $metrics[] = [
                'kpi_key' => $def->kpi_key,
                'kpi_name' => $def->kpi_name,
                'description' => $def->description,
                'format' => $def->format,
                'actual' => $actual,
                'target' => $target ? (float) $target : null,
                'achievement_percentage' => $achievement,
            ];
        }

        return [
            'role_category' => $roleSlug,
            'metrics' => $metrics,
        ];
    }

    private function calculateActual(User $user, string $roleSlug, string $kpiKey, array $dateRange): float
    {
        $startDate = $dateRange[0];
        $endDate = $dateRange[1];

        // Sales Logic
        if ($roleSlug === 'sales') {
            $query = Lead::where('owner_id', $user->id);
            if ($startDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'sales_leads_managed':
                    return (clone $query)->count();
                case 'sales_pipeline_value':
                    return (clone $query)->whereHas('funnelStage', function ($q) {
                        $q->whereNotIn('name', ['Won', 'Lost']);
                    })->sum('estimated_closing_amount') ?? 0.0;
                case 'sales_closed_won':
                    return (clone $query)->whereHas('funnelStage', function ($q) {
                        $q->where('name', 'Won');
                    })->sum('realized_closing_amount') ?? 0.0;
                case 'sales_win_rate':
                    $won = (clone $query)->whereHas('funnelStage', function ($q) {
                        $q->where('name', 'Won');
                    })->count();
                    $lost = (clone $query)->whereHas('funnelStage', function ($q) {
                        $q->where('name', 'Lost');
                    })->count();
                    $total = $won + $lost;
                    return $total > 0 ? round(($won / $total) * 100, 1) : 0.0;
            }
        }

        // Presales Logic
        if ($roleSlug === 'presales') {
            $query = Lead::where('presales_owner_id', $user->id);
            if ($startDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'presales_leads_managed':
                    return (clone $query)->count();
                case 'presales_demo_readiness':
                    return (clone $query)->avg('lead_score') ?? 0.0;
                case 'presales_eligible_count':
                    return (clone $query)->where('qualification_status', 'eligible')->count();
                case 'presales_eligible_rate':
                    $total = (clone $query)->count();
                    $eligible = (clone $query)->where('qualification_status', 'eligible')->count();
                    return $total > 0 ? round(($eligible / $total) * 100, 1) : 0.0;
            }
        }

        // AM Logic
        if ($roleSlug === 'am') {
            $query = Lead::where('am_owner_id', $user->id);
            if ($startDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'am_leads_managed':
                    return (clone $query)->count();
                case 'am_portfolio_value':
                    return (clone $query)->whereHas('funnelStage', function($q) {
                        $q->where('name', 'Won');
                    })->sum('realized_closing_amount') ?? 0.0;
                case 'am_avg_deal_size':
                    $wonQuery = (clone $query)->whereHas('funnelStage', function($q) {
                        $q->where('name', 'Won');
                    });
                    $count = $wonQuery->count();
                    $sum = $wonQuery->sum('realized_closing_amount');
                    return $count > 0 ? round($sum / $count, 2) : 0.0;
                case 'am_upsell_rate':
                    // Mock calculation for AM upsell
                    return 0.0;
            }
        }

        // CSM Logic
        if ($roleSlug === 'csm') {
            $query = Lead::where('csm_owner_id', $user->id);
            if ($startDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'csm_clients_managed':
                    return (clone $query)->count();
                case 'csm_health_score':
                    return (clone $query)->avg('lead_score') ?? 0.0;
                case 'csm_meetings_count':
                    return LeadActivity::where('activity_type', 'Meeting')
                        ->whereIn('lead_id', (clone $query)->pluck('id'))
                        ->count();
                case 'csm_activities_count':
                    return LeadActivity::whereIn('lead_id', (clone $query)->pluck('id'))->count();
            }
        }

        return 0.0;
    }

    private function determineRoleCategory(User $user): string
    {
        $roleSlug = strtolower($user->role?->name ?? '');

        if (str_contains($roleSlug, 'presales') || str_contains($roleSlug, 'architect') || str_contains($roleSlug, 'research')) {
            return 'presales';
        }
        
        if (str_contains($roleSlug, 'am') || str_contains($roleSlug, 'account_manager')) {
            return 'am';
        }
        
        if (str_contains($roleSlug, 'csm') || str_contains($roleSlug, 'success') || str_contains($roleSlug, 'customer')) {
            return 'csm';
        }

        if (str_contains($roleSlug, 'sales') || str_contains($roleSlug, 'exec') || str_contains($roleSlug, 'admin')) {
            return 'sales';
        }

        return 'other';
    }

    private function getDateRange(string $period): array
    {
        $now = Carbon::now();
        switch ($period) {
            case 'week':
                return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'biweekly':
                return [$now->copy()->subWeeks(2)->startOfWeek(), $now->copy()->endOfWeek()];
            case 'month':
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
            case 'quarter':
                return [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter()];
            case 'year':
                return [$now->copy()->startOfYear(), $now->copy()->endOfYear()];
            case 'all':
            default:
                return [null, null];
        }
    }
}
