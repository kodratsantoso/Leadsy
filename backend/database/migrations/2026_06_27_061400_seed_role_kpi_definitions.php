<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEFINITIONS = [
        // ── Sales ──
        ['role_slug' => 'sales', 'kpi_key' => 'sales_leads_managed',     'kpi_name' => 'Leads Managed',          'description' => 'Total leads assigned as owner or via role assignment',             'format' => 'number',     'weight' => 10],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_pipeline_value',    'kpi_name' => 'Pipeline Value',         'description' => 'Sum of estimated_closing_amount for active pipeline leads',       'format' => 'currency',   'weight' => 20],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_closed_won',        'kpi_name' => 'Closed Won Revenue',     'description' => 'Sum of realized_closing_amount for Won leads',                    'format' => 'currency',   'weight' => 25],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_win_rate',          'kpi_name' => 'Win Rate',               'description' => 'Won / (Won + Lost) as percentage',                               'format' => 'percentage', 'weight' => 15],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_quotation_count',   'kpi_name' => 'Quotations Sent',        'description' => 'Count of lead_quotations created in period',                      'format' => 'number',     'weight' => 10],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_follow_up_rate',    'kpi_name' => 'Follow-Up Completion',   'description' => 'Completed follow-ups / total follow-ups as percentage',           'format' => 'percentage', 'weight' => 10],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_meeting_count',     'kpi_name' => 'Meetings Held',          'description' => 'Count of lead_meetings in period',                                'format' => 'number',     'weight' => 5],
        ['role_slug' => 'sales', 'kpi_key' => 'sales_qualified_rate',    'kpi_name' => 'Qualified Lead Rate',    'description' => 'Eligible leads / total leads as percentage',                      'format' => 'percentage', 'weight' => 5],

        // ── Presales / Architect Solution ──
        ['role_slug' => 'presales', 'kpi_key' => 'presales_leads_managed',     'kpi_name' => 'Leads Managed',              'description' => 'Total leads assigned as presales_owner or via role assignment', 'format' => 'number',     'weight' => 10],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_brief_completion',  'kpi_name' => 'Pre-Meeting Brief Completion','description' => 'Leads with at least one pre-meeting brief / total leads',      'format' => 'percentage', 'weight' => 20],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_readiness_avg',     'kpi_name' => 'Avg Readiness Score',        'description' => 'Average readiness_score from lead_pre_meeting_briefs',         'format' => 'number',     'weight' => 20],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_bantc_rate',        'kpi_name' => 'BANTC Completion Rate',      'description' => 'Leads with bantc_question_guide / total leads',                'format' => 'percentage', 'weight' => 15],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_product_match',     'kpi_name' => 'Product Match Count',        'description' => 'Count of lead_product_matches created in period',              'format' => 'number',     'weight' => 10],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_eligible_rate',     'kpi_name' => 'Eligible Rate',              'description' => 'Eligible leads / total leads as percentage',                   'format' => 'percentage', 'weight' => 15],
        ['role_slug' => 'presales', 'kpi_key' => 'presales_demo_readiness',    'kpi_name' => 'Demo Readiness Score',       'description' => 'Average lead_score of presales-assigned leads',                'format' => 'number',     'weight' => 10],

        // ── Account Manager ──
        ['role_slug' => 'am', 'kpi_key' => 'am_accounts_managed',  'kpi_name' => 'Accounts Managed',     'description' => 'Total leads assigned as am_owner or via role assignment',                'format' => 'number',   'weight' => 10],
        ['role_slug' => 'am', 'kpi_key' => 'am_portfolio_value',   'kpi_name' => 'Portfolio Value',      'description' => 'Sum of realized_closing_amount for Won leads under AM',                  'format' => 'currency', 'weight' => 25],
        ['role_slug' => 'am', 'kpi_key' => 'am_avg_deal_size',     'kpi_name' => 'Avg Deal Size',        'description' => 'Portfolio value / Won lead count',                                       'format' => 'currency', 'weight' => 15],
        ['role_slug' => 'am', 'kpi_key' => 'am_renewal_count',     'kpi_name' => 'Renewal Orders',       'description' => 'Count of lead_sales_orders where order_type = renewal',                  'format' => 'number',   'weight' => 20],
        ['role_slug' => 'am', 'kpi_key' => 'am_expansion_revenue', 'kpi_name' => 'Expansion Revenue',    'description' => 'Sum of total_amount from lead_sales_orders where order_type = expansion', 'format' => 'currency', 'weight' => 20],
        ['role_slug' => 'am', 'kpi_key' => 'am_quotation_to_order','kpi_name' => 'Quotation-to-Order Rate','description' => 'Sales orders / quotations as percentage',                               'format' => 'percentage','weight' => 10],

        // ── CSM ──
        ['role_slug' => 'csm', 'kpi_key' => 'csm_clients_managed',   'kpi_name' => 'Clients Managed',       'description' => 'Total leads assigned as csm_owner or via role assignment',       'format' => 'number',     'weight' => 15],
        ['role_slug' => 'csm', 'kpi_key' => 'csm_health_score',      'kpi_name' => 'Avg Health Score',      'description' => 'Average lead_score of CSM-assigned leads (proxy health)',        'format' => 'number',     'weight' => 20],
        ['role_slug' => 'csm', 'kpi_key' => 'csm_meetings_count',    'kpi_name' => 'Meetings Count',        'description' => 'Count of lead_meetings for CSM-assigned leads',                 'format' => 'number',     'weight' => 15],
        ['role_slug' => 'csm', 'kpi_key' => 'csm_activities_count',  'kpi_name' => 'Activities Count',      'description' => 'Count of lead_activities for CSM-assigned leads',               'format' => 'number',     'weight' => 15],
        ['role_slug' => 'csm', 'kpi_key' => 'csm_follow_up_rate',    'kpi_name' => 'Follow-Up Completion',  'description' => 'Completed follow-ups / total follow-ups as percentage',         'format' => 'percentage', 'weight' => 20],
        ['role_slug' => 'csm', 'kpi_key' => 'csm_handover_readiness','kpi_name' => 'Handover Readiness',    'description' => 'Won leads with pre-meeting brief / total Won leads (CSM scope)','format' => 'percentage', 'weight' => 15],
    ];

    public function up(): void
    {
        foreach (self::DEFINITIONS as $def) {
            $exists = DB::table('kpi_definitions')
                ->where('role_slug', $def['role_slug'])
                ->where('kpi_key', $def['kpi_key'])
                ->exists();

            if (! $exists) {
                DB::table('kpi_definitions')->insert(array_merge($def, [
                    'formula_json' => json_encode(['source' => 'RoleKpiCalculationService']),
                    'is_active'    => true,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]));
            }
        }
    }

    public function down(): void
    {
        $keys = array_column(self::DEFINITIONS, 'kpi_key');
        DB::table('kpi_definitions')->whereIn('kpi_key', $keys)->delete();
    }
};
