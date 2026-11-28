<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadBusinessSignal;
use App\Models\LeadCompanyNews;
use App\Models\LeadNewsIntelligenceAnalysis;
use App\Models\LeadPreMeetingBrief;
use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class CompanyNewsIntelligenceService
{
    public function __construct(
        private AiOrchestrationService $ai,
    ) {}

    /**
     * Run AI Business Signals & Intelligence Analysis across active company news.
     *
     * @return array{success: bool, analysis: ?LeadNewsIntelligenceAnalysis, signals: Collection, message: string}
     */
    public function analyze(Lead $lead, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?: $lead->tenant_id;

        $articles = LeadCompanyNews::query()
            ->where('lead_id', $lead->id)
            ->where('is_relevant', true)
            ->where('is_excluded', false)
            ->orderByDesc('published_at')
            ->limit(10)
            ->get();

        if ($articles->isEmpty()) {
            return [
                'success' => false,
                'analysis' => null,
                'signals' => collect([]),
                'message' => 'Belum ada berita relevan yang tersedia untuk dianalisis. Silakan jalankan Temukan Berita terlebih dahulu.',
            ];
        }

        // Fetch active products from DB (Product Master SSOT)
        $products = Product::query()
            ->where('is_active', true)
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $q->orWhere('tenant_id', $tenantId);
                }
            })
            ->get(['id', 'name', 'code', 'category', 'description']);

        $productListStr = $products->map(fn ($p) => "- [ID: {$p->id}] {$p->name} ({$p->category}): {$p->description}")->join("\n");

        $newsContext = $articles->map(function ($a, $idx) {
            $date = $a->published_at ? $a->published_at->format('Y-m-d') : 'Recent';
            return "Article #" . ($idx + 1) . ":\nTitle: {$a->headline}\nSource: {$a->publisher_name} ({$date})\nSummary: {$a->summary}\nURL: {$a->canonical_url}\n";
        })->join("\n---\n");

        $prompt = "Act as an elite Enterprise B2B Sales Strategist & Intelligence Analyst.
Analyze the following verified recent company news articles for \"{$lead->company_name}\" (Industry: {$lead->industry?->name}, Domain: {$lead->website_domain}).

AVAILABLE PRODUCT CATALOG:
{$productListStr}

COMPANY NEWS ARTICLES:
{$newsContext}

YOUR MISSION:
Extract deep, actionable sales intelligence and business signals from these news developments.
Connect every finding to how our sales team can address company needs, capitalise on expansion opportunities, or mitigate risks.

RETURN A VALID JSON OBJECT WITH EXACTLY THIS STRUCTURE (do not wrap in extra prose):
{
  \"business_summary\": \"High-level executive overview of what is currently happening with this company based on the news (2-3 sentences).\",
  \"business_outlook\": \"Strategic outlook on their growth trajectory, market momentum, and current priorities (Positive/Aggressive/Defensive/Cautious with brief rationale).\",
  \"opportunity_signals\": [
    {
      \"title\": \"Clear signal title\",
      \"description\": \"Detailed context of why this news represents a sales opening.\",
      \"impact_level\": \"high\" | \"medium\" | \"low\",
      \"signal_type\": \"opportunity\" | \"expansion\" | \"financial\" | \"product_launch\" | \"leadership\",
      \"sentiment\": \"positive\",
      \"matched_product_id\": <number or null from Product Catalog>,
      \"matched_product_name\": \"<Product name from Catalog or null>\",
      \"actionable_recommendation\": \"Specific action the sales rep should take right now.\"
    }
  ],
  \"risk_signals\": [
    {
      \"title\": \"Clear risk or roadblock title\",
      \"description\": \"Context of the operational, regulatory, or market risk facing the prospect.\",
      \"impact_level\": \"high\" | \"medium\" | \"low\",
      \"signal_type\": \"risk\" | \"regulatory\",
      \"sentiment\": \"negative\",
      \"actionable_recommendation\": \"How our solution or pitch can help them de-risk or solve this hurdle.\"
    }
  ],
  \"pitching_recommendations\": [
    {
      \"angle_title\": \"Hook or value proposition title\",
      \"icebreaker\": \"Natural opening line referencing the news development to build instant rapport.\",
      \"value_prop\": \"How our product directly accelerates or safeguards their initiative.\",
      \"target_stakeholder\": \"Job title or role (e.g. Head of IT, CTO, VP Operations, CFO)\"
    }
  ],
  \"discovery_questions\": [
    {
      \"question\": \"Targeted question to ask during meeting?\",
      \"objective\": \"What insight does this question extract from the prospect?\",
      \"related_news_topic\": \"Short topic reference\"
    }
  ],
  \"bantc_hypotheses\": {
    \"budget\": \"Budget availability hypothesis based on news/funding/expansion\",
    \"authority\": \"Likely decision makers and sponsor level based on leadership/initiatives\",
    \"need\": \"Primary urgent operational or technology need\",
    \"timeline\": \"Urgency and rollout timeline estimate\",
    \"competitor\": \"Possible incumbent or alternative vendor considerations\"
  },
  \"confidence\": 88
}";

        $res = $this->ai->call('company_news_intelligence_analysis', $prompt, [
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name,
        ]);

        if (!$res['success'] || empty($res['content'])) {
            return [
                'success' => false,
                'analysis' => null,
                'signals' => collect([]),
                'message' => 'Gagal menjalankan analisis AI sinyal bisnis: ' . ($res['error'] ?? 'Unknown error'),
            ];
        }

        $rawText = trim((string) $res['content']);
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $rawText, $match)) {
            $rawText = trim($match[1]);
        } elseif (preg_match('/\{[\s\S]*\}/', $rawText, $match)) {
            $rawText = trim($match[0]);
        }

        $data = json_decode($rawText, true);
        if (!is_array($data)) {
            return [
                'success' => false,
                'analysis' => null,
                'signals' => collect([]),
                'message' => 'Format respons AI tidak valid.',
            ];
        }

        // 1. Save or Update Analysis
        $analysis = LeadNewsIntelligenceAnalysis::create([
            'lead_id' => $lead->id,
            'tenant_id' => $tenantId,
            'business_summary' => $data['business_summary'] ?? null,
            'business_outlook' => $data['business_outlook'] ?? null,
            'opportunity_signals' => $data['opportunity_signals'] ?? [],
            'risk_signals' => $data['risk_signals'] ?? [],
            'product_recommendations' => $data['product_recommendations'] ?? [],
            'pitching_recommendations' => $data['pitching_recommendations'] ?? [],
            'bantc_hypotheses' => $data['bantc_hypotheses'] ?? [],
            'discovery_questions' => $data['discovery_questions'] ?? [],
            'confidence' => (int) ($data['confidence'] ?? 85),
            'raw_ai_response' => $data,
        ]);

        // 2. Persist Business Signals
        // Clear previous signals for fresh state
        LeadBusinessSignal::where('lead_id', $lead->id)->delete();

        $savedSignals = collect([]);
        $allSignals = array_merge($data['opportunity_signals'] ?? [], $data['risk_signals'] ?? []);
        foreach ($allSignals as $sig) {
            $signalModel = LeadBusinessSignal::create([
                'lead_id' => $lead->id,
                'tenant_id' => $tenantId,
                'signal_type' => $sig['signal_type'] ?? 'opportunity',
                'sentiment' => $sig['sentiment'] ?? 'neutral',
                'impact_level' => $sig['impact_level'] ?? 'medium',
                'title' => $sig['title'] ?? 'Business Signal',
                'description' => $sig['description'] ?? null,
                'actionable_recommendation' => $sig['actionable_recommendation'] ?? null,
            ]);
            $savedSignals->push($signalModel);
        }

        return [
            'success' => true,
            'analysis' => $analysis,
            'signals' => $savedSignals,
            'message' => 'Analisis sinyal bisnis & rekomendasi pitching berhasil diperbarui!',
        ];
    }

    /**
     * Apply selected news pitching angles or intelligence directly into the Lead's Pre-Meeting Brief.
     */
    public function applyToBrief(Lead $lead, array $selectedAngle): array
    {
        $brief = LeadPreMeetingBrief::where('lead_id', $lead->id)->first();
        if (!$brief) {
            $brief = new LeadPreMeetingBrief([
                'lead_id' => $lead->id,
                'generated_by' => auth()->id(),
            ]);
        }

        $newsContext = "\n\n[News Intelligence Pitching Angle]\n" .
            "Topic: " . ($selectedAngle['angle_title'] ?? '') . "\n" .
            "Icebreaker: " . ($selectedAngle['icebreaker'] ?? '') . "\n" .
            "Value Proposition: " . ($selectedAngle['value_prop'] ?? '') . "\n" .
            "Target Stakeholder: " . ($selectedAngle['target_stakeholder'] ?? '');

        $brief->executive_brief = trim(($brief->executive_brief ?? '') . $newsContext);
        $brief->save();

        return [
            'success' => true,
            'message' => 'Rekomendasi pitching berita berhasil disematkan ke Pre-Meeting Brief!',
        ];
    }
}
