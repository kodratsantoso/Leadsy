<?php

namespace App\Services\Analytics;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadFollowUp;
use App\Models\LeadMeeting;
use App\Models\LeadPreMeetingBrief;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\LeadBantcQuestionGuide;
use App\Models\LeadProductMatch;
use App\Models\User;
use App\Models\KpiDefinition;
use App\Models\UserKpiTarget;
use Carbon\Carbon;

class RoleKpiCalculationService
{
    /**
     * Calculate KPI metrics for a given user and period.
     */
    public function calculateForUser(User $user, string $period = 'month'): array
    {
        $roleSlug = $this->determineRoleCategory($user);
        $dateRange = $this->getDateRange($period);

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

        foreach ($definitions as $def) {
            $actual = $this->calculateActual($user, $roleSlug, $def->kpi_key, $dateRange);
            $target = $targets->get($def->kpi_key);

            // Fallback: use user.target_revenue for revenue KPIs if no specific target
            if ($target === null && in_array($def->kpi_key, ['sales_closed_won', 'am_portfolio_value'])) {
                $target = $user->target_revenue ? (float) $user->target_revenue : null;
            }

            $achievement = null;
            $status = 'data_not_available';
            if ($target !== null && $target > 0) {
                $achievement = min(200, round(($actual / $target) * 100, 1));
                $status = $this->resolveStatus($achievement);
            } elseif ($actual > 0) {
                $status = 'on_track';
            } elseif ($actual == 0) {
                $status = 'on_track'; // Zero is valid when no data exists yet
            }

            $dataSource = $this->getDataSource($def->kpi_key);

            $metrics[] = [
                'kpi_key'               => $def->kpi_key,
                'kpi_name'              => $def->kpi_name,
                'label'                 => $def->kpi_name,
                'description'           => $def->description,
                'format'                => $def->format,
                'role'                  => $roleSlug,
                'actual'                => $actual,
                'target'                => $target ? (float) $target : null,
                'achievement_percentage' => $achievement,
                'status'                => $status,
                'trend'                 => [
                    'direction'          => 'unavailable',
                    'percentage_change'  => null,
                ],
                'data_source'           => $dataSource['tables'],
                'calculation_basis'     => $dataSource['basis'],
                'limitation'            => $dataSource['limitation'] ?? '',
                'drilldown_available'   => true,
            ];
        }

        return [
            'role_category' => $roleSlug,
            'metrics' => $metrics,
        ];
    }

    private function calculateActual(User $user, string $roleSlug, string $kpiKey, array $dateRange): float
    {
        [$startDate, $endDate] = $dateRange;

        // ── Sales KPIs ──
        if ($roleSlug === 'sales') {
            $leadsQuery = Lead::where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('roleAssignments', fn ($sq) => $sq->where('user_id', $user->id)->where('role_type', 'sales'));
            });
            if ($startDate) {
                $leadsQuery->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'sales_leads_managed':
                    return (float) (clone $leadsQuery)->count();

                case 'sales_pipeline_value':
                    return (float) ((clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost']))->sum('estimated_closing_amount') ?? 0);

                case 'sales_closed_won':
                    return (float) ((clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Won'))->sum('realized_closing_amount') ?? 0);

                case 'sales_win_rate':
                    $won = (clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Won'))->count();
                    $lost = (clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Lost'))->count();
                    $total = $won + $lost;
                    return $total > 0 ? round(($won / $total) * 100, 1) : 0.0;

                case 'sales_quotation_count':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadQuotation::whereIn('lead_id', $leadIds)->count();

                case 'sales_follow_up_rate':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    $total = LeadFollowUp::whereIn('lead_id', $leadIds)->count();
                    $completed = LeadFollowUp::whereIn('lead_id', $leadIds)->where('status', 'completed')->count();
                    return $total > 0 ? round(($completed / $total) * 100, 1) : 0.0;

                case 'sales_meeting_count':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadMeeting::whereIn('lead_id', $leadIds)->count();

                case 'sales_qualified_rate':
                    $total = (clone $leadsQuery)->count();
                    $eligible = (clone $leadsQuery)->where('qualification_status', 'eligible')->count();
                    return $total > 0 ? round(($eligible / $total) * 100, 1) : 0.0;
            }
        }

        // ── Presales / Architect Solution KPIs ──
        if ($roleSlug === 'presales') {
            $leadsQuery = Lead::where(function ($q) use ($user) {
                $q->where('presales_owner_id', $user->id)
                  ->orWhereHas('roleAssignments', fn ($sq) => $sq->where('user_id', $user->id)->where('role_type', 'presales'));
            });
            if ($startDate) {
                $leadsQuery->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'presales_leads_managed':
                    return (float) (clone $leadsQuery)->count();

                case 'presales_brief_completion':
                    $total = (clone $leadsQuery)->count();
                    $withBrief = (clone $leadsQuery)->whereHas('preMeetingBriefs')->count();
                    return $total > 0 ? round(($withBrief / $total) * 100, 1) : 0.0;

                case 'presales_readiness_avg':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) (LeadPreMeetingBrief::whereIn('lead_id', $leadIds)->avg('readiness_score') ?? 0);

                case 'presales_bantc_rate':
                    $total = (clone $leadsQuery)->count();
                    $withBantc = (clone $leadsQuery)->whereHas('bantcQuestionGuide')->count();
                    return $total > 0 ? round(($withBantc / $total) * 100, 1) : 0.0;

                case 'presales_product_match':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadProductMatch::whereIn('lead_id', $leadIds)->count();

                case 'presales_eligible_rate':
                    $total = (clone $leadsQuery)->count();
                    $eligible = (clone $leadsQuery)->where('qualification_status', 'eligible')->count();
                    return $total > 0 ? round(($eligible / $total) * 100, 1) : 0.0;

                case 'presales_demo_readiness':
                    return (float) ((clone $leadsQuery)->avg('lead_score') ?? 0);
            }
        }

        // ── Account Manager KPIs ──
        if ($roleSlug === 'am') {
            $leadsQuery = Lead::where(function ($q) use ($user) {
                $q->where('am_owner_id', $user->id)
                  ->orWhereHas('roleAssignments', fn ($sq) => $sq->where('user_id', $user->id)->where('role_type', 'account_manager'));
            });
            if ($startDate) {
                $leadsQuery->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'am_accounts_managed':
                    return (float) (clone $leadsQuery)->count();

                case 'am_portfolio_value':
                    return (float) ((clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Won'))->sum('realized_closing_amount') ?? 0);

                case 'am_avg_deal_size':
                    $wonQuery = (clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Won'));
                    $count = $wonQuery->count();
                    $sum = $wonQuery->sum('realized_closing_amount');
                    return $count > 0 ? round($sum / $count, 2) : 0.0;

                case 'am_renewal_count':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadSalesOrder::whereIn('lead_id', $leadIds)->where('order_type', 'renewal')->count();

                case 'am_expansion_revenue':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) (LeadSalesOrder::whereIn('lead_id', $leadIds)->where('order_type', 'expansion')->sum('total_amount') ?? 0);

                case 'am_quotation_to_order':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    $quotations = LeadQuotation::whereIn('lead_id', $leadIds)->count();
                    $orders = LeadSalesOrder::whereIn('lead_id', $leadIds)->count();
                    return $quotations > 0 ? round(($orders / $quotations) * 100, 1) : 0.0;
            }
        }

        // ── CSM KPIs ──
        if ($roleSlug === 'csm') {
            $leadsQuery = Lead::where(function ($q) use ($user) {
                $q->where('csm_owner_id', $user->id)
                  ->orWhereHas('roleAssignments', fn ($sq) => $sq->where('user_id', $user->id)->where('role_type', 'csm'));
            });
            if ($startDate) {
                $leadsQuery->whereBetween('created_at', [$startDate, $endDate]);
            }

            switch ($kpiKey) {
                case 'csm_clients_managed':
                    return (float) (clone $leadsQuery)->count();

                case 'csm_health_score':
                    return (float) ((clone $leadsQuery)->avg('lead_score') ?? 0);

                case 'csm_meetings_count':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadMeeting::whereIn('lead_id', $leadIds)->count();

                case 'csm_activities_count':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    return (float) LeadActivity::whereIn('lead_id', $leadIds)->count();

                case 'csm_follow_up_rate':
                    $leadIds = (clone $leadsQuery)->pluck('id');
                    $total = LeadFollowUp::whereIn('lead_id', $leadIds)->count();
                    $completed = LeadFollowUp::whereIn('lead_id', $leadIds)->where('status', 'completed')->count();
                    return $total > 0 ? round(($completed / $total) * 100, 1) : 0.0;

                case 'csm_handover_readiness':
                    $wonLeads = (clone $leadsQuery)->whereHas('funnelStage', fn ($q) => $q->where('name', 'Won'));
                    $total = $wonLeads->count();
                    $withBrief = (clone $wonLeads)->whereHas('preMeetingBriefs')->count();
                    return $total > 0 ? round(($withBrief / $total) * 100, 1) : 0.0;
            }
        }

        return 0.0;
    }

    private function resolveStatus(float $achievement): string
    {
        if ($achievement >= 100) return 'exceeded';
        if ($achievement >= 75) return 'on_track';
        if ($achievement >= 50) return 'at_risk';
        return 'behind';
    }

    private function getDataSource(string $kpiKey): array
    {
        $map = [
            'sales_leads_managed'      => ['tables' => ['leads', 'lead_role_assignments'], 'basis' => 'Count of leads where owner_id = user or role_assignment.role_type = sales'],
            'sales_pipeline_value'     => ['tables' => ['leads', 'funnel_stages'], 'basis' => 'Sum of estimated_closing_amount where funnel_stage not in Won/Lost'],
            'sales_closed_won'         => ['tables' => ['leads', 'funnel_stages'], 'basis' => 'Sum of realized_closing_amount where funnel_stage = Won'],
            'sales_win_rate'           => ['tables' => ['leads', 'funnel_stages'], 'basis' => 'Won / (Won + Lost) count'],
            'sales_quotation_count'    => ['tables' => ['leads', 'lead_quotations'], 'basis' => 'Count of quotations for owned leads'],
            'sales_follow_up_rate'     => ['tables' => ['leads', 'lead_follow_ups'], 'basis' => 'Completed follow-ups / total follow-ups'],
            'sales_meeting_count'      => ['tables' => ['leads', 'lead_meetings'], 'basis' => 'Count of meetings for owned leads'],
            'sales_qualified_rate'     => ['tables' => ['leads'], 'basis' => 'Leads with qualification_status = eligible / total leads'],

            'presales_leads_managed'     => ['tables' => ['leads', 'lead_role_assignments'], 'basis' => 'Count of leads where presales_owner_id = user or role_assignment.role_type = presales'],
            'presales_brief_completion'  => ['tables' => ['leads', 'lead_pre_meeting_briefs'], 'basis' => 'Leads with at least one pre-meeting brief / total leads'],
            'presales_readiness_avg'     => ['tables' => ['lead_pre_meeting_briefs'], 'basis' => 'Average readiness_score across all briefs for assigned leads'],
            'presales_bantc_rate'        => ['tables' => ['leads', 'lead_bantc_question_guides'], 'basis' => 'Leads with BANTC question guide / total leads'],
            'presales_product_match'     => ['tables' => ['leads', 'lead_product_matches'], 'basis' => 'Count of product matches for assigned leads'],
            'presales_eligible_rate'     => ['tables' => ['leads'], 'basis' => 'Leads with qualification_status = eligible / total leads'],
            'presales_demo_readiness'    => ['tables' => ['leads'], 'basis' => 'Average lead_score of presales-assigned leads'],

            'am_accounts_managed'    => ['tables' => ['leads', 'lead_role_assignments'], 'basis' => 'Count of leads where am_owner_id = user or role_assignment.role_type = account_manager'],
            'am_portfolio_value'     => ['tables' => ['leads', 'funnel_stages'], 'basis' => 'Sum of realized_closing_amount for Won leads under AM scope'],
            'am_avg_deal_size'       => ['tables' => ['leads', 'funnel_stages'], 'basis' => 'Portfolio value / Won lead count'],
            'am_renewal_count'       => ['tables' => ['leads', 'lead_sales_orders'], 'basis' => 'Count of sales orders where order_type = renewal'],
            'am_expansion_revenue'   => ['tables' => ['leads', 'lead_sales_orders'], 'basis' => 'Sum of total_amount where order_type = expansion'],
            'am_quotation_to_order'  => ['tables' => ['leads', 'lead_quotations', 'lead_sales_orders'], 'basis' => 'Sales orders / quotations as percentage'],

            'csm_clients_managed'     => ['tables' => ['leads', 'lead_role_assignments'], 'basis' => 'Count of leads where csm_owner_id = user or role_assignment.role_type = csm'],
            'csm_health_score'        => ['tables' => ['leads'], 'basis' => 'Average lead_score of CSM-assigned leads (proxy health score)', 'limitation' => 'No dedicated customer health scoring module; uses lead_score as proxy'],
            'csm_meetings_count'      => ['tables' => ['leads', 'lead_meetings'], 'basis' => 'Count of meetings for CSM-assigned leads'],
            'csm_activities_count'    => ['tables' => ['leads', 'lead_activities'], 'basis' => 'Count of activities for CSM-assigned leads'],
            'csm_follow_up_rate'      => ['tables' => ['leads', 'lead_follow_ups'], 'basis' => 'Completed follow-ups / total follow-ups for CSM-assigned leads'],
            'csm_handover_readiness'  => ['tables' => ['leads', 'lead_pre_meeting_briefs', 'funnel_stages'], 'basis' => 'Won leads with pre-meeting brief / total Won leads'],
        ];

        return $map[$kpiKey] ?? ['tables' => ['unknown'], 'basis' => 'Unknown KPI calculation', 'limitation' => ''];
    }

    public function determineRoleCategory(User $user): string
    {
        $roleSlug = strtolower($user->role?->name ?? '');

        if (str_contains($roleSlug, 'presales') || str_contains($roleSlug, 'architect') || str_contains($roleSlug, 'research')) {
            return 'presales';
        }

        if ($roleSlug === 'account_manager' || str_contains($roleSlug, 'account_manager')) {
            return 'am';
        }

        if (str_contains($roleSlug, 'csm') || str_contains($roleSlug, 'success') || str_contains($roleSlug, 'customer')) {
            return 'csm';
        }

        if (str_contains($roleSlug, 'sales') || str_contains($roleSlug, 'exec')) {
            return 'sales';
        }

        // Admins/executives don't have role-specific KPIs; default to sales for dashboard
        if (str_contains($roleSlug, 'admin') || str_contains($roleSlug, 'executive')) {
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
