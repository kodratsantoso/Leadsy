<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadAiEvaluation;
use App\Models\LeadBattleCard;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

class CompetitiveBattleCardService
{
    public function __construct(
        private AiOrchestrationService $aiService,
    ) {}

    /**
     * Generate or fetch battle card for a lead and identified competitor.
     *
     * @param Lead $lead
     * @param string|null $explicitCompetitor
     * @return LeadBattleCard
     */
    public function generateBattleCard(Lead $lead, ?string $explicitCompetitor = null): LeadBattleCard
    {
        $competitorName = $this->resolveCompetitorName($lead, $explicitCompetitor);

        if (empty($competitorName) || in_array(strtolower($competitorName), ['none', 'no competitor', 'unknown', '-'])) {
            $competitorName = 'General Market Alternatives';
        }

        // Prepare context
        $productName = $lead->product?->name ?? 'Our Enterprise Solution';
        $companyName = $lead->company_name;
        $industry = $lead->businessCategory?->name ?? $lead->business_category ?? 'General B2B';

        $prompt = json_encode([
            'company_name' => $companyName,
            'industry' => $industry,
            'competitor_name' => $competitorName,
            'our_product' => $productName,
            'current_needs' => $lead->needs ?? 'Operational efficiency and sales intelligence',
            'current_budget' => $lead->budget ?? 'Standard commercial',
        ], JSON_PRETTY_PRINT);

        $aiResult = $this->aiService->call('competitive_battle_card', $prompt, [
            'lead_id' => $lead->id,
            'competitor' => $competitorName,
        ]);

        $parsed = null;
        if (!empty($aiResult['success']) && !empty($aiResult['content'])) {
            $parsed = $this->parseAiContent($aiResult['content']);
        }

        // Fallback default battle card content if AI is not configured or fails
        if (!$parsed) {
            $parsed = $this->buildFallbackCard($competitorName, $productName);
        }

        return LeadBattleCard::updateOrCreate(
            [
                'lead_id' => $lead->id,
                'competitor_name' => $competitorName,
            ],
            [
                'advantages' => $parsed['advantages'] ?? [],
                'weaknesses' => $parsed['weaknesses'] ?? [],
                'counter_tactics' => $parsed['counter_tactics'] ?? [],
                'key_talking_points' => $parsed['key_talking_points'] ?? [],
                'pricing_intelligence' => $parsed['pricing_intelligence'] ?? [],
                'source' => !empty($aiResult['success']) ? 'ai_generated' : 'rule_based_fallback',
                'metadata' => [
                    'model' => $aiResult['model'] ?? 'fallback',
                    'generated_at' => now()->toIso8601String(),
                ],
            ]
        );
    }

    /**
     * Resolve competitor name from lead or latest evaluation.
     */
    public function resolveCompetitorName(Lead $lead, ?string $explicitCompetitor = null): ?string
    {
        if (!empty($explicitCompetitor)) {
            return trim($explicitCompetitor);
        }

        if (!empty($lead->competitor)) {
            return trim($lead->competitor);
        }

        $latestEval = LeadAiEvaluation::where('lead_id', $lead->id)
            ->latest('evaluated_at')
            ->first();

        $evalCompetitor = $latestEval?->bantc_extracted['competitor'] ?? null;
        if (!empty($evalCompetitor)) {
            return trim($evalCompetitor);
        }

        return null;
    }

    /**
     * Parse AI JSON content safely.
     */
    private function parseAiContent(string $content): ?array
    {
        // Strip markdown code fences if present
        $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $clean = preg_replace('/\s*```$/', '', $clean);

        $decoded = json_decode($clean, true);
        if (is_array($decoded) && isset($decoded['advantages'])) {
            return $decoded;
        }

        return null;
    }

    /**
     * Fallback structured battle card when AI is offline or mocking.
     */
    private function buildFallbackCard(string $competitor, string $ourProduct): array
    {
        return [
            'advantages' => [
                "Tailored Indonesian B2B workflows and local regulatory/compliance alignment compared to {$competitor}.",
                "Native multi-channel intelligence integrating WhatsApp, Map Discovery, and Lark.",
                "Real-time AI revenue scoring with deterministic qualification safeguards.",
            ],
            'weaknesses' => [
                "{$competitor} often relies on generic global templates with high customization and implementation costs.",
                "Limited localization for Indonesian payment, currency, and multi-tier distributor workflows.",
                "Slower customer support response times outside GMT+7 timezone.",
            ],
            'counter_tactics' => [
                "When {$competitor} is mentioned on price: Highlight total cost of ownership (TCO) and zero hidden implementation fees with {$ourProduct}.",
                "When {$competitor} claims broad enterprise suite: Focus the conversation on depth of sales execution, field team adoption, and immediate time-to-value.",
                "Propose a side-by-side pilot benchmark on lead enrichment speed and data accuracy.",
            ],
            'key_talking_points' => [
                "'We understand {$competitor} has a strong presence, but our clients switch to us because our solution is built specifically for high-velocity Indonesian B2B sales.'",
                "'With {$ourProduct}, your sales team starts seeing enriched leads and actionable meeting summaries on day one without months of heavy IT integration.'",
            ],
            'pricing_intelligence' => [
                "Position against {$competitor}'s rigid annual seat licenses by offering flexible tier-based pricing with full AI features included.",
            ],
        ];
    }
}
