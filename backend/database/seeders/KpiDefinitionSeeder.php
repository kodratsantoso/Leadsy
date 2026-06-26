<?php

namespace Database\Seeders;

use App\Models\KpiDefinition;
use Illuminate\Database\Seeder;

class KpiDefinitionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $definitions = [
            // Sales
            [
                'role_slug' => 'sales',
                'kpi_key' => 'sales_leads_managed',
                'kpi_name' => 'Leads Managed',
                'description' => 'Total active leads assigned.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'sales',
                'kpi_key' => 'sales_pipeline_value',
                'kpi_name' => 'Pipeline Value',
                'description' => 'Sum of estimated closing amounts in active funnel.',
                'format' => 'currency',
            ],
            [
                'role_slug' => 'sales',
                'kpi_key' => 'sales_closed_won',
                'kpi_name' => 'Closed Won Revenue',
                'description' => 'Realized revenue from won deals.',
                'format' => 'currency',
            ],
            [
                'role_slug' => 'sales',
                'kpi_key' => 'sales_win_rate',
                'kpi_name' => 'Win Rate',
                'description' => 'Percentage of closed deals that were won.',
                'format' => 'percentage',
            ],

            // Presales
            [
                'role_slug' => 'presales',
                'kpi_key' => 'presales_leads_managed',
                'kpi_name' => 'Presales Leads Managed',
                'description' => 'Total leads assisted by presales.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'presales',
                'kpi_key' => 'presales_demo_readiness',
                'kpi_name' => 'Demo Readiness Score',
                'description' => 'Average tech score of leads.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'presales',
                'kpi_key' => 'presales_eligible_count',
                'kpi_name' => 'Eligible Leads',
                'description' => 'Total leads qualified as eligible.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'presales',
                'kpi_key' => 'presales_eligible_rate',
                'kpi_name' => 'Eligibility Rate',
                'description' => 'Percentage of presales leads deemed eligible.',
                'format' => 'percentage',
            ],

            // Account Manager
            [
                'role_slug' => 'am',
                'kpi_key' => 'am_leads_managed',
                'kpi_name' => 'Accounts Managed',
                'description' => 'Total accounts assigned.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'am',
                'kpi_key' => 'am_portfolio_value',
                'kpi_name' => 'Portfolio Value',
                'description' => 'Total realized value in portfolio.',
                'format' => 'currency',
            ],
            [
                'role_slug' => 'am',
                'kpi_key' => 'am_avg_deal_size',
                'kpi_name' => 'Average Deal Size',
                'description' => 'Average closing amount of won deals.',
                'format' => 'currency',
            ],
            [
                'role_slug' => 'am',
                'kpi_key' => 'am_upsell_rate',
                'kpi_name' => 'Upsell Rate',
                'description' => 'Percentage of clients with upsells.',
                'format' => 'percentage',
            ],

            // CSM
            [
                'role_slug' => 'csm',
                'kpi_key' => 'csm_clients_managed',
                'kpi_name' => 'Clients Managed',
                'description' => 'Total active clients assigned.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'csm',
                'kpi_key' => 'csm_health_score',
                'kpi_name' => 'Average Health Score',
                'description' => 'Average health score across client base.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'csm',
                'kpi_key' => 'csm_meetings_count',
                'kpi_name' => 'Meetings Count',
                'description' => 'Total meetings conducted with clients.',
                'format' => 'number',
            ],
            [
                'role_slug' => 'csm',
                'kpi_key' => 'csm_activities_count',
                'kpi_name' => 'Activities Logged',
                'description' => 'Total touchpoints across assigned clients.',
                'format' => 'number',
            ],
        ];

        foreach ($definitions as $def) {
            KpiDefinition::updateOrCreate(
                ['role_slug' => $def['role_slug'], 'kpi_key' => $def['kpi_key']],
                $def
            );
        }
    }
}
