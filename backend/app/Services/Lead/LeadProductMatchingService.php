<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadProductMatchRun;
use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Lead Product Matching Service — Module A (Lead Intelligence Engine)
 *
 * Full BANT + Competitor AI-powered matching:
 * - Budget: estimated budget fit vs product price tier
 * - Authority: decision-maker presence in contacts / engagement level
 * - Need: pain point alignment between lead activities/transcripts and product use cases
 * - Timeline: urgency signals from activities and transcript evaluations
 * - Competitor: current tools vs competitor replacement notes
 * - Industry fit, company size, engagement signals
 *
 * AI routing via Settings → AI Default (feature route: 'product_matching')
 */
class LeadProductMatchingService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /* ══════════════════════════════════════════════════════════════════
     * PUBLIC API
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Match a lead against all active products.
     * Creates an audit run record and returns the array of matches.
     */
    public function matchLeadToProducts(Lead $lead, ?int $triggeredBy = null): array
    {
        $startMs = (int) (microtime(true) * 1000);

        $products = Product::where('status', 'active')->with('tiers')->get();
        $context = $this->buildLeadContext($lead);
        $matches = [];
        $aiCalls = 0;
        $totalCost = 0.0;
        $runStatus = 'completed';
        $runError = null;

        try {
            foreach ($products as $product) {
                $result = $this->matchLeadToProduct($lead, $product, $context);
                $matches[] = $result['match'];
                $aiCalls += $result['ai_called'] ? 1 : 0;
                $totalCost += $result['cost'];
            }
        } catch (\Throwable $e) {
            $runStatus = 'failed';
            $runError = $e->getMessage();
            Log::error('[ProductMatching] Failed', ['lead_id' => $lead->id, 'msg' => $e->getMessage()]);
        }

        $durationMs = (int) (microtime(true) * 1000) - $startMs;

        // Audit run record
        LeadProductMatchRun::create([
            'lead_id' => $lead->id,
            'triggered_by' => $triggeredBy,
            'products_evaluated' => $products->count(),
            'matches_created' => count($matches),
            'ai_calls_made' => $aiCalls,
            'total_cost_usd' => $totalCost > 0 ? round($totalCost, 6) : null,
            'duration_ms' => $durationMs,
            'status' => $runStatus,
            'error_message' => $runError,
            'run_at' => Carbon::now(),
        ]);

        return $matches;
    }

    /**
     * Get top product recommendations for a lead (reads existing matches).
     */
    public function getTopRecommendations(Lead $lead, int $limit = 3): array
    {
        return $lead->productMatches()
            ->where('is_recommended', true)
            ->orderByDesc('match_score')
            ->limit($limit)
            ->with('product')
            ->get()
            ->toArray();
    }

    /**
     * Delete old matches and rerun matching against all products.
     */
    public function rematchLeadToProducts(Lead $lead, ?int $triggeredBy = null): array
    {
        $lead->productMatches()->delete();

        return $this->matchLeadToProducts($lead, $triggeredBy);
    }

    /* ══════════════════════════════════════════════════════════════════
     * LEAD CONTEXT BUILDER
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Gather all BANT + engagement signals from the lead's related data.
     */
    private function buildLeadContext(Lead $lead): array
    {
        $lead->loadMissing([
            'industry', 'subIndustry', 'contacts',
            'activities', 'qualifications', 'aiAnalyses',
            'scores', 'meetings',
        ]);

        // Latest qualification (has budget/need proxies)
        $latestQual = $lead->qualifications->sortByDesc('created_at')->first();

        // Latest AI analysis (has pain point / urgency context)
        $latestAnalysis = $lead->aiAnalyses->sortByDesc('created_at')->first();

        // Latest lead score
        $latestScore = $lead->scores->sortByDesc('created_at')->first();

        // Activity and engagement signals
        $activityCount = $lead->activities->count();
        $recentActivities = $lead->activities
            ->sortByDesc('activity_date')
            ->take(5)
            ->pluck('activity_type')
            ->toArray();
        $activityOutcomes = $lead->activities
            ->whereNotNull('outcome')
            ->pluck('outcome')
            ->toArray();

        // Meeting summaries
        $meetingSummaries = $lead->meetings
            ->take(3)
            ->pluck('summary')
            ->filter()
            ->toArray();

        // Authority signals: number of decision-maker contacts
        $primaryContact = $lead->contacts->firstWhere('is_primary', true);
        $contactTitles = $lead->contacts->pluck('title')->filter()->toArray();

        // Transcript signals (load on demand if available)
        $transcriptSignals = [];
        try {
            $evals = $lead->aiEvaluations()
                ->latest('evaluated_at')
                ->take(3)
                ->get();
            foreach ($evals as $eval) {
                $transcriptSignals[] = [
                    'sentiment' => $eval->sentiment,
                    'intent_level' => $eval->intent_level,
                    'interest_level' => $eval->interest_level,
                    'buying_signals' => $eval->buying_signals ?? [],
                    'objections' => $eval->objections_detected ?? [],
                    'next_action' => $eval->next_best_action,
                ];
            }
        } catch (\Throwable) {
        }

        return [
            // Company profile
            'company_name' => $lead->company_name,
            'address' => $lead->address,
            'industry' => $lead->industry?->name,
            'sub_industry' => $lead->subIndustry?->name,
            'business_cat' => $lead->business_category,
            'company_size' => $lead->company_size_estimate,

            // Contact signals (Authority)
            'contact_count' => $lead->contacts->count(),
            'primary_contact' => $primaryContact ? [
                'name' => $primaryContact->name,
                'title' => $primaryContact->title,
            ] : null,
            'contact_titles' => $contactTitles,

            // Engagement signals (Need + Timeline)
            'activity_count' => $activityCount,
            'recent_activities' => $recentActivities,
            'activity_outcomes' => $activityOutcomes,
            'meeting_summaries' => $meetingSummaries,

            // AI transcript evaluations (Need + Timeline + Competitor)
            'transcript_signals' => $transcriptSignals,

            // Qualification data
            'qualification_status' => $lead->qualification_status,
            'qualified' => $latestQual?->qualified,
            'qualification_reason' => $latestQual?->qualification_reason,
            'risk_flags' => $latestQual?->risk_flags ?? [],
            'business_type' => $latestQual?->business_type,

            // AI analysis
            'company_summary' => $latestAnalysis?->company_summary,
            'probable_needs' => $latestAnalysis?->probable_needs ?? [],
            'potential_use_case' => $latestAnalysis?->potential_use_case,
            'suggested_approach' => $latestAnalysis?->suggested_approach,
            'urgency_level' => $latestAnalysis?->urgency_level,
            'risk_insight' => $latestAnalysis?->risk_insight,

            // Lead score
            'lead_score' => $latestScore?->score ?? $lead->lead_score,
            'lead_grade' => $latestScore?->grade,

            // Contact info completeness
            'has_email' => ! empty($lead->email),
            'has_phone' => ! empty($lead->phone),
            'has_website' => ! empty($lead->website),
        ];
    }

    /* ══════════════════════════════════════════════════════════════════
     * CORE MATCHING
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Match a single lead→product using hybrid rule + AI BANT analysis.
     */
    private function matchLeadToProduct(Lead $lead, Product $product, array $ctx): array
    {
        // 1. Rule-based base score
        $ruleScore = $this->calculateRuleBasedScore($ctx, $product);

        // 2. AI-powered BANT + Competitor analysis
        $aiResult = $this->runAiAnalysis($ctx, $product);
        $aiScore = $aiResult['score'] ?? 50;
        $bant = $aiResult['bant'] ?? [];
        $reasoning = $aiResult['reasoning'] ?? [];
        $approach = $aiResult['recommended_approach'] ?? '';
        $competitor = $aiResult['competitor_context'] ?? '';
        $confidence = $aiResult['confidence'] ?? 50;
        $aiCalled = $aiResult['ai_called'] ?? false;
        $cost = $aiResult['cost'] ?? 0.0;
        $provider = $aiResult['provider'] ?? null;
        $model = $aiResult['model'] ?? null;

        // 3. Combine: 60% rule-based, 40% AI
        $finalScore = (int) round($ruleScore * 0.60 + $aiScore * 0.40);
        $finalScore = min(100, max(0, $finalScore));

        // 4. Match level
        $matchLevel = match (true) {
            $finalScore >= 70 => 'strong',
            $finalScore >= 45 => 'moderate',
            default => 'weak',
        };

        $isRecommended = $finalScore >= 45;

        // 5. Upsert match record
        $existing = $lead->productMatches()->where('product_id', $product->id)->first();

        $data = [
            'match_score' => $finalScore,
            'match_reason' => implode(' ', array_slice($reasoning, 0, 3)),
            'bant_analysis' => $bant ?: null,
            'reasoning' => $reasoning ?: null,
            'recommended_approach' => $approach ?: null,
            'competitor_context' => $competitor ?: null,
            'match_level' => $matchLevel,
            'confidence_score' => $confidence,
            'ai_provider_used' => $provider,
            'ai_model_used' => $model,
            'is_recommended' => $isRecommended,
            'last_matched_at' => Carbon::now(),
        ];

        if ($existing) {
            $existing->update($data);
            $match = $existing->fresh();
        } else {
            $match = $lead->productMatches()->create(array_merge($data, [
                'product_id' => $product->id,
            ]));
        }

        return ['match' => $match, 'ai_called' => $aiCalled, 'cost' => $cost];
    }

    /* ══════════════════════════════════════════════════════════════════
     * RULE-BASED SCORING
     * ══════════════════════════════════════════════════════════════════ */

    private function calculateRuleBasedScore(array $ctx, Product $product): int
    {
        $score = 0;

        // Industry alignment (30 pts)
        if ($product->target_industry && $ctx['industry']) {
            $productInd = strtolower($product->target_industry);
            $leadInd = strtolower($ctx['industry']);
            if (str_contains($productInd, $leadInd) || str_contains($leadInd, $productInd)) {
                $score += 30;
            } elseif ($ctx['sub_industry'] && str_contains($productInd, strtolower($ctx['sub_industry']))) {
                $score += 15;
            } elseif ($ctx['business_cat'] && str_contains($productInd, strtolower($ctx['business_cat']))) {
                $score += 10;
            }
        }

        // Company size alignment (20 pts)
        $sizeTarget = strtolower($product->target_company_size ?? $product->ideal_company_profile ?? '');
        if (! empty($ctx['company_size']) && ! empty($sizeTarget)) {
            $leadSize = strtolower($ctx['company_size']);
            $bands = ['1-10' => 'micro', '11-50' => 'small', '51-200' => 'mid', '201-500' => 'mid', '501-1000' => 'large', '1000+' => 'enterprise'];
            $leadBand = $bands[$ctx['company_size']] ?? null;
            if (
                str_contains($sizeTarget, $leadSize) ||
                ($leadBand && str_contains($sizeTarget, $leadBand)) ||
                str_contains($sizeTarget, 'any') || str_contains($sizeTarget, 'all')
            ) {
                $score += 20;
            } else {
                $score += 5; // partial credit
            }
        }

        // Authority: decision-maker contact available (15 pts)
        $decisionTitles = ['ceo', 'cfo', 'coo', 'director', 'manager', 'head', 'vp', 'president', 'owner'];
        foreach ($ctx['contact_titles'] as $title) {
            foreach ($decisionTitles as $keyword) {
                if (str_contains(strtolower($title), $keyword)) {
                    $score += 15;
                    break 2;
                }
            }
        }
        if ($ctx['contact_count'] > 0 && $score < 15) {
            $score += 7; // has contacts but unknown seniority
        }

        // Engagement / activity (15 pts)
        if ($ctx['activity_count'] >= 5) {
            $score += 15;
        } elseif ($ctx['activity_count'] >= 2) {
            $score += 10;
        } elseif ($ctx['activity_count'] >= 1) {
            $score += 5;
        }

        // Contact data completeness (10 pts)
        $score += ($ctx['has_email'] ? 4 : 0) + ($ctx['has_phone'] ? 3 : 0) + ($ctx['has_website'] ? 3 : 0);

        // Lead score bonus (10 pts)
        if ($ctx['lead_score'] >= 70) {
            $score += 10;
        } elseif ($ctx['lead_score'] >= 50) {
            $score += 5;
        }

        return min(100, $score);
    }

    /* ══════════════════════════════════════════════════════════════════
     * AI BANT + COMPETITOR ANALYSIS
     * ══════════════════════════════════════════════════════════════════ */

    private function runAiAnalysis(array $ctx, Product $product): array
    {
        $prompt = $this->buildPrompt($ctx, $product);

        $aiResult = $this->ai->call('product_matching', $prompt, [
            'entity_type' => 'lead_product_match',
            'entity_id' => ($ctx['company_name'] ?? '').'_'.$product->id,
        ]);

        if (! $aiResult['success'] || empty($aiResult['content'])) {
            return [
                'score' => 50,
                'bant' => [],
                'reasoning' => ['AI analysis unavailable — rule-based score used.'],
                'ai_called' => true,
                'cost' => 0,
            ];
        }

        $parsed = json_decode($aiResult['content'], true);

        if (! is_array($parsed)) {
            return [
                'score' => 50,
                'reasoning' => ['AI returned non-JSON content — using default.'],
                'ai_called' => true,
                'cost' => (float) ($aiResult['cost'] ?? 0),
            ];
        }

        return [
            'score' => min(100, max(0, (int) ($parsed['match_score'] ?? 50))),
            'bant' => $parsed['bant_analysis'] ?? [],
            'reasoning' => $parsed['reasoning'] ?? [],
            'recommended_approach' => $parsed['recommended_approach'] ?? '',
            'competitor_context' => $parsed['competitor_context'] ?? '',
            'confidence' => min(100, max(0, (int) ($parsed['confidence_score'] ?? 50))),
            'ai_called' => true,
            'cost' => (float) ($aiResult['cost'] ?? 0),
            'provider' => $aiResult['provider'] ?? null,
            'model' => $aiResult['model'] ?? null,
        ];
    }

    private function buildPrompt(array $ctx, Product $product): string
    {
        $ctxJson = json_encode($ctx, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $productJson = json_encode([
            'name' => $product->name,
            'category' => $product->category,
            'description' => $product->description,
            'target_industry' => $product->target_industry,
            'target_company_size' => $product->target_company_size ?? $product->ideal_company_profile,
            'target_pain_points' => $product->target_pain_points,
            'target_buyer_persona' => $product->target_buyer_persona,
            'budget_range' => $product->budget_range,
            'use_cases' => $product->use_cases,
            'competitor_notes' => $product->competitor_notes,
            'keywords' => $product->keywords,
            'supported_regions' => $product->supported_regions,
            'tiers' => $product->tiers->map(fn($t) => [
                'name' => $t->name,
                'price' => $t->price,
                'pricing_type' => $t->pricing_type,
                'billing_period' => $t->billing_period,
                'subscription_duration' => $t->subscription_duration_value . ' ' . $t->subscription_duration_unit,
                'features' => $t->features,
            ]),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a B2B sales intelligence engine. Evaluate the fit between a lead and a product using BANT and competitor analysis.

## PRODUCT
{$productJson}

## LEAD CONTEXT
{$ctxJson}

## TASK
Analyze the BANT qualification variables and competitor context, then score the product-to-lead fit.

BANT Framework:
- Budget: Does the lead's size, industry, and signals suggest they can afford this product?
- Authority: Are the available contacts decision-makers or influencers?
- Need: Do the lead's pain points, industry, and activities align with this product's use cases?
- Timeline: Do engagement signals (activity frequency, urgency level, buying signals) suggest readiness to buy?
- Competitor: Are there signals of competitor product usage that this product can displace?

Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "match_score": 0-100,
  "match_level": "strong | moderate | weak",
  "confidence_score": 0-100,
  "bant_analysis": {
    "budget": "Assessment of budget fit",
    "authority": "Assessment of decision-maker access",
    "need": "Assessment of need alignment",
    "timeline": "Assessment of purchase timeline readiness",
    "competitor": "Competitor context and displacement opportunity"
  },
  "reasoning": [
    "Specific reason 1",
    "Specific reason 2",
    "Specific reason 3"
  ],
  "recommended_approach": "Specific sales approach for this lead-product combination",
  "competitor_context": "Current tools or competitors identified and displacement strategy",
  "missing_information": ["field1", "field2"]
}
PROMPT;
    }
}
