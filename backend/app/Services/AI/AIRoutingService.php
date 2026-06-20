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
        'conversation_evaluation' => 'Conversation Evaluation',
        'transcript_evaluation' => 'Transcript Evaluation',
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
    ];

    public function listRoutes(): Collection
    {
        return AiFeatureRoute::with(['aiModel.provider'])
            ->orderBy('feature_name')
            ->orderBy('priority')
            ->get();
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

            return $this->listRoutes()->where('feature_name', $featureName)->values();
        });
    }
}
