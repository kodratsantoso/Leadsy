<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TargetConfigController extends Controller
{
    public function config(): JsonResponse
    {
        $config = [
            'sales' => [
                'closed_won_revenue' => ['value_type' => 'amount', 'cascade_enabled' => true],
                'new_business_revenue' => ['value_type' => 'amount', 'cascade_enabled' => true],
                'meeting_scheduled' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'qualified_leads' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'quotation_created' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'sales_order_confirmed' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'win_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'follow_up_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'first_response_sla' => ['value_type' => 'percentage', 'cascade_enabled' => false],
            ],
            'presales' => [
                'pre_meeting_brief_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'discovery_quality_score' => ['value_type' => 'score', 'cascade_enabled' => false],
                'bantc_completion_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'demo_completed' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'demo_to_next_step_conversion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'product_fit_analysis_completed' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'product_fit_accuracy' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'use_case_mapping_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'proposal_readiness_score' => ['value_type' => 'score', 'cascade_enabled' => false],
                'risk_identified' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'question_guide_usage' => ['value_type' => 'percentage', 'cascade_enabled' => false],
            ],
            'csm' => [
                'handover_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'onboarding_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'time_to_first_value' => ['value_type' => 'days', 'cascade_enabled' => false],
                'training_session_completed' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'training_completion_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'adoption_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'customer_health_score' => ['value_type' => 'score', 'cascade_enabled' => false],
                'issue_resolution_sla' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'adoption_plan_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'customer_satisfaction_score' => ['value_type' => 'score', 'cascade_enabled' => false],
                'renewal_risk_reduction' => ['value_type' => 'percentage', 'cascade_enabled' => false],
            ],
            'account_manager' => [
                'renewal_revenue' => ['value_type' => 'amount', 'cascade_enabled' => false],
                'expansion_revenue' => ['value_type' => 'amount', 'cascade_enabled' => false],
                'renewal_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'account_retention_rate' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'net_revenue_retention' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'qbr_completion' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'account_plan_completion' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'stakeholder_coverage' => ['value_type' => 'score', 'cascade_enabled' => false],
                'churn_risk_reduction' => ['value_type' => 'percentage', 'cascade_enabled' => false],
                'upsell_opportunity_created' => ['value_type' => 'quantity', 'cascade_enabled' => false],
                'cross_sell_opportunity_created' => ['value_type' => 'quantity', 'cascade_enabled' => false],
            ]
        ];

        return response()->json($config);
    }
}
