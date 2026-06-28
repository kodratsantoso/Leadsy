<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TargetConfigController extends Controller
{
    public function config(): JsonResponse
    {
        $config = [
            'revenue_target' => [
                'roles' => ['sales', 'account_manager'],
                'periods' => ['yearly', 'quarterly', 'monthly'],
                'cascade_enabled' => true,
                'allocation_methods' => ['amount', 'percentage'],
                'currency_source' => 'default_currency_setting',
                'revenue_types_by_role' => [
                    'sales' => [
                        'new_business_revenue',
                        'closed_won_revenue',
                        'sales_order_confirmed'
                    ],
                    'account_manager' => [
                        'renewal_revenue',
                        'expansion_revenue',
                        'upsell_revenue',
                        'cross_sell_revenue',
                        'net_revenue_retention'
                    ]
                ]
            ],
            'kpi_target' => [
                'roles' => ['sales', 'presales', 'csm', 'account_manager'],
                'cascade_enabled' => false,
                'kpi_types_by_role' => [
                    'sales' => [
                        'leads_assigned' => ['value_type' => 'quantity'],
                        'first_response_sla' => ['value_type' => 'hours'],
                        'follow_up_completion_rate' => ['value_type' => 'percentage'],
                        'meeting_scheduled' => ['value_type' => 'quantity'],
                        'qualified_leads' => ['value_type' => 'quantity'],
                        'quotation_created' => ['value_type' => 'quantity'],
                        'sales_order_confirmed' => ['value_type' => 'quantity'],
                        'win_rate' => ['value_type' => 'percentage'],
                        'lost_reason_completion' => ['value_type' => 'percentage'],
                    ],
                    'presales' => [
                        'pre_meeting_brief_completion' => ['value_type' => 'percentage'],
                        'bantc_completion_rate' => ['value_type' => 'percentage'],
                        'demo_completed' => ['value_type' => 'quantity'],
                        'demo_to_next_step_conversion' => ['value_type' => 'percentage'],
                        'product_fit_analysis_completed' => ['value_type' => 'quantity'],
                        'product_fit_accuracy' => ['value_type' => 'percentage'],
                        'use_case_mapping_completion' => ['value_type' => 'percentage'],
                        'proposal_readiness_score' => ['value_type' => 'score'],
                        'risk_identified' => ['value_type' => 'quantity'],
                        'question_guide_usage' => ['value_type' => 'percentage'],
                    ],
                    'csm' => [
                        'handover_completion' => ['value_type' => 'percentage'],
                        'onboarding_completion' => ['value_type' => 'percentage'],
                        'training_session_completed' => ['value_type' => 'quantity'],
                        'training_completion_rate' => ['value_type' => 'percentage'],
                        'adoption_rate' => ['value_type' => 'percentage'],
                        'customer_health_score' => ['value_type' => 'score'],
                        'issue_resolution_sla' => ['value_type' => 'hours'],
                        'adoption_plan_completion' => ['value_type' => 'percentage'],
                        'renewal_risk_reduction' => ['value_type' => 'percentage'],
                    ],
                    'account_manager' => [
                        'renewal_rate' => ['value_type' => 'percentage'],
                        'account_retention_rate' => ['value_type' => 'percentage'],
                        'qbr_completion' => ['value_type' => 'quantity'],
                        'account_plan_completion' => ['value_type' => 'percentage'],
                        'stakeholder_coverage' => ['value_type' => 'score'],
                        'churn_risk_reduction' => ['value_type' => 'percentage'],
                        'upsell_opportunity_created' => ['value_type' => 'quantity'],
                        'cross_sell_opportunity_created' => ['value_type' => 'quantity'],
                    ]
                ]
            ]
        ];

        return response()->json($config);
    }
}
