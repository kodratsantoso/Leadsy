<?php

namespace App\Services\AI;

use App\Models\AiFeatureRoute;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AIRoutingService
{
    public const FEATURE_CATALOG = [
        'lead_analysis' => 'Lead Analysis',
        'lead_scoring' => 'Lead Scoring Analysis',
        'qualification_analysis' => 'Qualification Analysis',
        'product_matching' => 'Product Matching Analysis',
        'product_understanding' => 'Product Understanding',
        'icp_generation' => 'ICP Profile Generation',
        'meeting_evaluation' => 'Meeting Evaluation',
        'activity_transcript_analysis' => 'Activity Transcript Analysis',
        'next_action_recommendation' => 'Next Action Recommendation',
        'recommendation_engine' => 'Recommendation Engine',
        'summary_generation' => 'Summary Generation',
        'revenue_intelligence_analysis' => 'Revenue Intelligence Analysis',
        'whatsapp_analysis' => 'WhatsApp Analysis',
        'product_metadata_generation' => 'Product Metadata Generation',
        'geo_product_fit_analysis' => 'Geo Product Fit Analysis',
        'product_question_generation' => 'Product Question Guide Generation',
        'lead_bantc_question_generation' => 'Lead BANTC Question Guide Generation',
        'lead_contact_google_search_keyword' => 'Lead Contact Google Search Keyword',
        'dashboard_ai_insight' => 'Dashboard AI Insight',
        'pre_meeting_brief_generation' => 'Pre-Meeting Brief Generation',
        'customer_journey_story' => 'Customer Journey Story Generation',
        'lead_company_enrichment' => 'Lead Company Enrichment',
        'lead_industry_classification' => 'Lead Industry Classification',
        'lead_business_category_classification' => 'Lead Business Category Classification',
        'lead_company_size_classification' => 'Lead Company Size Classification',
        'lead_initial_rescore' => 'Lead Initial Re-score',
        'lead_initial_requalification' => 'Lead Initial Re-qualification',
        'lead_initial_icp_match' => 'Lead Initial ICP Match',
        'lead_enrichment_summary' => 'Lead Enrichment Summary',
        'lead_ai_profiling' => 'Lead AI Company Profiling',
        'meeting_summary' => 'Meeting Summary Generation',

        'lead_enrichment' => 'Lead Firmographic Enrichment',
        'lead_icp_matching' => 'Lead ICP Matching',
        'competitive_battle_card' => 'Competitive Battle Card',
        'cs_playbook_ai' => 'Customer Success Playbook',
        'ai_account_review_generator' => 'Account Review Generator',
        'ps_task_breakdown_generation' => 'Professional Service Task Breakdown',
        'product_specification_comparison' => 'Product Specification Comparison',
        'sales_copilot' => 'In-Context Sales Copilot Assistant',

        // Meeting Summary is one AI call ('meeting_summary') whose prompt is assembled
        // from a general instruction plus one per meeting type. They are fetched by
        // MeetingSummaryGenerationService through getActiveVersionForFeature(), not
        // ->call(), which is why they never appeared in this catalog and the settings
        // page listed them by their variable names.
        'meeting_summary_general_prompt' => 'Meeting Summary — General (all meeting types)',
        'meeting_summary_discovery_prompt' => 'Meeting Summary — Discovery',
        'meeting_summary_demo_prompt' => 'Meeting Summary — Demo',
        'meeting_summary_follow_up_prompt' => 'Meeting Summary — Follow-up',
        'meeting_summary_proposal_discussion_prompt' => 'Meeting Summary — Proposal Discussion',
        'meeting_summary_closing_discussion_prompt' => 'Meeting Summary — Closing Discussion',
        'meeting_summary_handover_csm_prompt' => 'Meeting Summary — Handover to CSM',
    ];

    public function listRoutes(?string $featureName = null): Collection
    {
        $query = AiFeatureRoute::with(['aiModel.provider'])
            ->orderBy('feature_name')
            ->orderBy('priority');

        if ($featureName) {
            $query->where('feature_name', $featureName);
        }

        return $query->get();
    }

    public function featureCatalog(): array
    {
        return collect(self::FEATURE_CATALOG)->map(fn (string $label, string $key) => [
            'key' => $key,
            'label' => $label,
        ])->values()->all();
    }

    public function saveFeatureRoutes(string $featureName, array $routes): Collection
    {
        return DB::transaction(function () use ($featureName, $routes) {
            AiFeatureRoute::where('feature_name', $featureName)->delete();

            foreach ($routes as $route) {
                if (empty($route['ai_model_id'])) {
                    continue;
                }

                AiFeatureRoute::create([
                    'feature_name' => $featureName,
                    'ai_model_id' => $route['ai_model_id'],
                    'priority' => $route['priority'],
                    'max_retries' => $route['max_retries'] ?? 1,
                    'timeout_seconds' => $route['timeout_seconds'] ?? 30,
                    'cache_ttl_minutes' => $route['cache_ttl_minutes'] ?? null,
                    'max_tokens' => $route['max_tokens'] ?? null,
                    'complexity_mode' => $route['complexity_mode'] ?? 'standard',
                    'cost_sensitivity' => $route['cost_sensitivity'] ?? 'balanced',
                    'is_active' => $route['is_active'] ?? true,
                ]);
            }

            return $this->listRoutes($featureName);
        });
    }
}
