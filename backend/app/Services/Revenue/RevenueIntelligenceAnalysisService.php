<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\LeadRevenueAnalysis;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

/**
 * Revenue Intelligence Analyst AI
 *
 * Fills the system prompt template with real lead data, calls the AI,
 * and persists the structured 11-field analysis result.
 *
 * Feature route name: revenue_intelligence_analysis
 */
class RevenueIntelligenceAnalysisService
{
    private const FEATURE = 'revenue_intelligence_analysis';

    public function __construct(private AiOrchestrationService $ai) {}

    public function analyze(Lead $lead): LeadRevenueAnalysis
    {
        $lead->loadMissing([
            'industry',
            'product',
            'contacts',
            'activities' => fn ($q) => $q->latest('activity_date')->limit(10),
            'meetings' => fn ($q) => $q->latest('meeting_date')->limit(5),
            'transcripts' => fn ($q) => $q->latest()->limit(3),
            'sources',
        ]);

        $prompt = $this->buildPrompt($lead);
        $result = $this->ai->call(self::FEATURE, $prompt, ['lead_id' => $lead->id]);

        if ($result['success'] && ! empty($result['content'])) {
            $parsed = $this->parseResponse($result['content']);
            $status = $parsed ? 'success' : 'partial';
        } else {
            $parsed = null;
            $status = 'failed';
            Log::warning('[RevenueIntelligenceAnalysis] AI call failed for lead '.$lead->id, [
                'error' => $result['error'] ?? 'unknown',
            ]);
        }

        $fallback = $this->fallback();
        $data = $parsed ?? $fallback;

        return LeadRevenueAnalysis::create([
            'lead_id' => $lead->id,
            'business_type' => $data['business_type'] ?? $fallback['business_type'],
            'use_case' => $data['use_case'] ?? $fallback['use_case'],
            'intent_level' => $data['intent_level'] ?? $fallback['intent_level'],
            'urgency' => $data['urgency'] ?? $fallback['urgency'],
            'probability_to_close' => $data['probability_to_close'] ?? $fallback['probability_to_close'],
            'buying_signals' => $data['buying_signals'] ?? $fallback['buying_signals'],
            'objections' => $data['objections'] ?? $fallback['objections'],
            'recommended_action' => $data['recommended_action'] ?? $fallback['recommended_action'],
            'recommended_approach' => $data['recommended_approach'] ?? $fallback['recommended_approach'],
            'confidence' => $data['confidence'] ?? $fallback['confidence'],
            'reasoning' => $data['reasoning'] ?? $fallback['reasoning'],
            'ai_model' => $result['model'] ?? null,
            'prompt_tokens' => $result['tokens']['prompt'] ?? null,
            'completion_tokens' => $result['tokens']['completion'] ?? null,
            'cost_usd' => $result['cost'] ?? null,
            'status' => $status,
            'raw_response' => $result['content'] ?? null,
        ]);
    }

    /* ── Prompt Builder ─────────────────────────────────────────────── */

    private function buildPrompt(Lead $lead): string
    {
        $leadName = $lead->company_name;
        $industry = $lead->industry?->name ?? 'Unknown';
        $description = $this->buildDescription($lead);
        $source = $this->buildSource($lead);
        $website = $lead->website ?? $lead->website_domain ?? 'Not provided';
        $activitySummary = $this->buildActivitySummary($lead);
        $meetingNotes = $this->buildMeetingNotes($lead);
        $transcript = $this->buildTranscripts($lead);

        return <<<PROMPT
SYSTEM ROLE: Revenue Intelligence Analyst AI

OBJECTIVE:
Analyze a lead and determine:
* business relevance
* buying intent
* opportunity potential
* recommended action

---

INPUT:

Lead Data:
* Name: {$leadName}
* Industry: {$industry}
* Description: {$description}
* Source: {$source}
* Website: {$website}
* Activity Summary: {$activitySummary}
* Meeting Notes: {$meetingNotes}
* Conversation Transcript: {$transcript}

---

TASK:
1. Classify business type
2. Identify potential use case
3. Detect buying signals
4. Detect objections
5. Assess urgency
6. Estimate probability to close
7. Recommend next action

---

OUTPUT FORMAT:
{
  "business_type": "",
  "use_case": "",
  "intent_level": "high | medium | low",
  "urgency": "high | medium | low",
  "probability_to_close": 0-100,
  "buying_signals": [],
  "objections": [],
  "recommended_action": "",
  "recommended_approach": "",
  "confidence": 0-1,
  "reasoning": []
}

---

RULES:
* Be deterministic and structured
* Do NOT hallucinate
* Base reasoning only on provided data
* If data is insufficient, mark confidence low
* Return ONLY valid JSON — no markdown, no extra text
PROMPT;
    }

    private function buildDescription(Lead $lead): string
    {
        $parts = [];
        if ($lead->business_category) {
            $parts[] = "Category: {$lead->business_category}";
        }
        if ($lead->company_size_estimate) {
            $parts[] = "Size: {$lead->company_size_estimate}";
        }
        if ($lead->address) {
            $parts[] = "Location: {$lead->address}";
        }
        if ($lead->email) {
            $parts[] = "Email: {$lead->email}";
        }
        if ($lead->phone) {
            $parts[] = "Phone: {$lead->phone}";
        }
        if ($lead->ai_explanation) {
            $parts[] = "AI Note: {$lead->ai_explanation}";
        }

        if ($lead->product) {
            $parts[] = "Target Product: {$lead->product->name}";
            if ($lead->product->description) {
                $parts[] = "Product Description: {$lead->product->description}";
            }
            if ($lead->product->target_pain_points) {
                $parts[] = "Pain Points Addressed: {$lead->product->target_pain_points}";
            }
            if ($lead->product->target_buyer_persona) {
                $parts[] = "Buyer Persona: {$lead->product->target_buyer_persona}";
            }
        }

        return $parts ? implode('; ', $parts) : 'No additional description available';
    }

    private function buildSource(Lead $lead): string
    {
        if ($lead->sources->isEmpty()) {
            return 'Unknown';
        }

        return $lead->sources->map(fn ($s) => $s->source_type.($s->confidence ? " (conf: {$s->confidence})" : ''))->implode(', ');
    }

    private function buildActivitySummary(Lead $lead): string
    {
        if ($lead->activities->isEmpty()) {
            return 'No activities recorded';
        }

        $lines = $lead->activities->map(function ($a) {
            $date = $a->activity_date ? date('Y-m-d', strtotime($a->activity_date)) : 'unknown date';
            $notes = $a->notes ? ' — '.mb_substr($a->notes, 0, 120) : '';

            return "- [{$date}] {$a->activity_type}{$notes}";
        });

        return $lines->implode("\n");
    }

    private function buildMeetingNotes(Lead $lead): string
    {
        if ($lead->meetings->isEmpty()) {
            return 'No meetings recorded';
        }

        $sections = $lead->meetings->map(function ($m) {
            $date = $m->meeting_date ? date('Y-m-d', strtotime($m->meeting_date)) : 'unknown date';
            $parts = ["[{$date}] {$m->title}"];
            if ($m->summary) {
                $parts[] = 'Summary: '.mb_substr($m->summary, 0, 200);
            }
            if ($m->key_points) {
                $parts[] = 'Key Points: '.(is_array($m->key_points) ? implode(', ', $m->key_points) : mb_substr($m->key_points, 0, 150));
            }
            if ($m->objections) {
                $parts[] = 'Objections: '.(is_array($m->objections) ? implode(', ', $m->objections) : mb_substr($m->objections, 0, 150));
            }
            if ($m->next_steps) {
                $parts[] = 'Next Steps: '.mb_substr($m->next_steps, 0, 150);
            }

            return implode("\n  ", $parts);
        });

        return $sections->implode("\n");
    }

    private function buildTranscripts(Lead $lead): string
    {
        if ($lead->transcripts->isEmpty()) {
            return 'No transcripts available';
        }

        $sections = $lead->transcripts->map(function ($t) {
            $date = $t->recorded_at ? date('Y-m-d', strtotime($t->recorded_at)) : 'unknown date';
            $text = mb_substr($t->transcript_text ?? '', 0, 500);

            return "[{$date} — {$t->source_type}]\n{$text}".(strlen($t->transcript_text ?? '') > 500 ? '...' : '');
        });

        return $sections->implode("\n\n");
    }

    /* ── Response Parser ─────────────────────────────────────────────── */

    private function parseResponse(string $content): ?array
    {
        // Strip any markdown code fences if model adds them despite instructions
        $clean = preg_replace('/```(?:json)?\s*([\s\S]*?)```/i', '$1', trim($content));
        $data = json_decode(trim($clean), true);

        if (! is_array($data)) {
            return null;
        }

        // Normalise confidence: accept both 0-1 and 0-100
        if (isset($data['confidence']) && $data['confidence'] > 1) {
            $data['confidence'] = $data['confidence'] / 100;
        }

        // Ensure arrays
        foreach (['buying_signals', 'objections', 'reasoning'] as $field) {
            if (isset($data[$field]) && ! is_array($data[$field])) {
                $data[$field] = [$data[$field]];
            }
        }

        return $data;
    }

    private function fallback(): array
    {
        return [
            'business_type' => 'Unknown — insufficient data',
            'use_case' => 'To be determined after discovery call',
            'intent_level' => 'low',
            'urgency' => 'low',
            'probability_to_close' => 20.0,
            'buying_signals' => [],
            'objections' => ['Insufficient data to detect objections'],
            'recommended_action' => 'Gather more information through initial outreach',
            'recommended_approach' => 'Discovery-first approach — qualify before pitching',
            'confidence' => 0.1,
            'reasoning' => ['AI analysis unavailable — result generated from fallback logic'],
        ];
    }
}
