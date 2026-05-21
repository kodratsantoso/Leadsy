<?php

namespace App\Services;

use App\Models\Lead;
use App\Services\AI\AiOrchestrationService;

class LeadBantcQuestionGenerationService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * @return array{success: bool, questions?: array, ai_model?: string|null, error?: string}
     */
    public function generate(Lead $lead): array
    {
        $lead->loadMissing([
            'industry',
            'subIndustry',
            'funnelStage',
            'owner',
            'product',
            'contacts',
            'sources.channelType',
            'scores',
            'qualifications',
            'productMatches.product',
            'aiAnalyses',
            'revenueAnalyses',
        ]);

        $result = $this->ai->call('lead_bantc_question_generation', $this->buildPrompt($lead), [
            'lead_id' => $lead->id,
            'lead_name' => $lead->company_name,
        ]);

        if (! $result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI generation failed.'];
        }

        $questions = $this->parseQuestions($result['content'] ?? '');

        if (empty($questions)) {
            return ['success' => false, 'error' => 'AI returned an empty BANTC question list. Try again.'];
        }

        return [
            'success' => true,
            'questions' => $questions,
            'ai_model' => $result['model'] ?? null,
        ];
    }

    private function buildPrompt(Lead $lead): string
    {
        $contacts = $lead->contacts
            ->take(5)
            ->map(fn ($contact) => trim(($contact->name ?? 'Unknown') . ' - ' . ($contact->title ?? 'Unknown role')))
            ->filter()
            ->values()
            ->implode('; ');

        $sources = $lead->sources
            ->map(fn ($source) => trim(($source->source_type ?? 'unknown') . ($source->channelType?->name ? ' / ' . $source->channelType->name : '')))
            ->filter()
            ->unique()
            ->values()
            ->implode(', ');

        $topProductMatches = $lead->productMatches
            ->sortByDesc('match_score')
            ->take(3)
            ->map(fn ($match) => trim(($match->product?->name ?? 'Product') . ' (' . ($match->match_score ?? 0) . '% match)'))
            ->values()
            ->implode('; ');

        $latestScore = $lead->scores->sortByDesc('created_at')->first();
        $latestQualification = $lead->qualifications->sortByDesc('created_at')->first();
        $latestAnalysis = $lead->aiAnalyses->sortByDesc('created_at')->first();
        $latestRevenueAnalysis = $lead->revenueAnalyses->sortByDesc('created_at')->first();

        $fields = array_filter([
            'Company' => $lead->company_name,
            'Address' => $lead->address,
            'Industry' => $lead->industry?->name,
            'Sub Industry' => $lead->subIndustry?->name,
            'Business Category' => $lead->business_category,
            'Company Size' => $lead->company_size_estimate,
            'Website' => $lead->website,
            'Phone' => $lead->phone,
            'Email' => $lead->email,
            'Current Stage' => $lead->funnelStage?->name,
            'Qualification Status' => $lead->qualification_status,
            'Lead Score' => $latestScore?->score ?? $lead->lead_score,
            'Latest Qualification' => $latestQualification?->qualified,
            'Estimated Closing Amount' => $lead->estimated_closing_amount,
            'Realized Closing Amount' => $lead->realized_closing_amount,
            'Assigned Product' => $lead->product?->name,
            'Top Product Matches' => $topProductMatches,
            'Known Contacts' => $contacts,
            'Lead Sources' => $sources,
            'AI Insight Summary' => $latestAnalysis?->business_opportunity_summary ?? $latestAnalysis?->company_summary,
            'Revenue Intent Level' => $latestRevenueAnalysis?->intent_level,
            'Revenue Use Case' => $latestRevenueAnalysis?->use_case,
            'Probability To Close' => $latestRevenueAnalysis?->probability_to_close,
        ]);

        $leadContext = collect($fields)
            ->map(fn ($value, $key) => "- {$key}: {$value}")
            ->implode("\n");

        return <<<PROMPT
You are a senior B2B sales discovery coach for an Indonesian sales team.

Generate a tailored BANTC discovery question guide for this specific customer/lead.

LEAD CONTEXT:
{$leadContext}

BANTC means:
1. Budget — budget range, funding source, purchase constraints, ROI expectations
2. Authority — decision makers, influencers, procurement, legal, technical approvers
3. Need — pain points, current process, desired outcomes, impact of inaction
4. Timeline — urgency, milestones, implementation window, target decision date
5. Competition — incumbent solution, alternatives, vendor comparison, switching risk

TASK:
Generate 12-15 open-ended questions that help the user qualify this lead and decide what to do next. Make the questions specific to the lead context and product signals when available.

RULES:
- Questions must be conversational and usable during a live discovery call
- Each question must belong to one exact category: "Budget", "Authority", "Need", "Timeline", "Competition"
- Include at least two questions for each BANTC category
- Output ONLY valid JSON — no markdown, no explanation, no extra text
- Preferred output is a JSON object with a "questions" array
- Each item must have exactly these keys: "id", "text", "category", "order"

EXAMPLE FORMAT:
{
  "questions": [
    {"id":"b1","text":"How have you allocated budget for solving this issue this year?","category":"Budget","order":1},
    {"id":"a1","text":"Who besides you will be involved in approving a solution like this?","category":"Authority","order":2}
  ]
}
PROMPT;
    }

    private function parseQuestions(string $content): array
    {
        $json = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $json = preg_replace('/\s*```$/', '', trim($json ?? ''));
        $json = trim($json ?? '');

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            $start = strpos($json, '[');
            $end = strrpos($json, ']');

            if ($start === false || $end === false || $end <= $start) {
                return [];
            }

            $decoded = json_decode(substr($json, $start, $end - $start + 1), true);
        }

        if (! is_array($decoded)) {
            return [];
        }

        if (isset($decoded['questions']) && is_array($decoded['questions'])) {
            $decoded = $decoded['questions'];
        }

        $questions = [];
        foreach ($decoded as $index => $item) {
            if (! is_array($item) || empty($item['text'])) {
                continue;
            }

            $questions[] = [
                'id' => (string) ($item['id'] ?? ('bantc-' . ($index + 1))),
                'text' => trim((string) $item['text']),
                'category' => $this->normalizeCategory($item['category'] ?? ''),
                'order' => (int) ($item['order'] ?? ($index + 1)),
            ];
        }

        usort($questions, fn ($a, $b) => $a['order'] <=> $b['order']);

        return array_values($questions);
    }

    private function normalizeCategory(string $category): string
    {
        $allowed = ['Budget', 'Authority', 'Need', 'Timeline', 'Competition'];
        $category = trim($category);

        foreach ($allowed as $item) {
            if (strcasecmp($category, $item) === 0) {
                return $item;
            }
        }

        foreach ($allowed as $item) {
            if (str_contains(strtolower($category), strtolower($item))) {
                return $item;
            }
        }

        return 'Need';
    }
}
