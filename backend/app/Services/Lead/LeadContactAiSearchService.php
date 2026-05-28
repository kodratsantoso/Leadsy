<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Str;

class LeadContactAiSearchService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * @return array{success: bool, candidates?: array, ai_model?: string|null, error?: string}
     */
    public function search(Lead $lead): array
    {
        $prompt = $this->buildPrompt($lead);
        $result = $this->ai->call('lead_contact_ai_search', $prompt, [
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'website_domain' => $lead->website_domain,
        ]);

        if (! $result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI contact search failed.'];
        }

        $candidates = $this->parseCandidates($result['content'] ?? '', $lead);

        if (empty($candidates)) {
            return ['success' => false, 'error' => 'AI did not return usable LinkedIn contact candidates.'];
        }

        return [
            'success' => true,
            'candidates' => $candidates,
            'ai_model' => $result['model'] ?? null,
        ];
    }

    private function buildPrompt(Lead $lead): string
    {
        $leadContext = json_encode([
            'company_name' => $lead->company_name,
            'website' => $lead->website,
            'website_domain' => $lead->website_domain,
            'industry' => $lead->industry?->name,
            'business_category' => $lead->business_category,
            'address' => $lead->address,
            'company_size_estimate' => $lead->company_size_estimate,
        ], JSON_PRETTY_PRINT);

        return <<<PROMPT
You are a B2B lead research assistant for Leadsy.

Find likely PIC/contact candidates for the company below from LinkedIn public profile signals. Prioritize decision makers, commercial leaders, operations leaders, finance leaders, procurement leaders, IT leaders, and managers relevant to B2B sales.

Company context:
{$leadContext}

Return ONLY valid JSON with this exact shape:
{
  "candidates": [
    {
      "name": "",
      "title": "",
      "linkedin_url": "",
      "linkedin_id": "",
      "company_name": "",
      "confidence_score": 0,
      "relevance_reason": "",
      "evidence": ""
    }
  ]
}

Rules:
- Include 1-8 candidates.
- Use LinkedIn URLs or public identifiers only when you can infer them from public profile patterns or available evidence.
- Do not invent email or phone numbers.
- If uncertain, keep confidence_score below 70 and explain the uncertainty in evidence.
- confidence_score must be an integer from 0 to 100.
PROMPT;
    }

    private function parseCandidates(string $content, Lead $lead): array
    {
        $json = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $json = preg_replace('/\s*```$/', '', trim($json));
        $decoded = json_decode(trim($json), true);

        if (! is_array($decoded)) {
            $start = strpos($json, '{');
            $end = strrpos($json, '}');
            if ($start === false || $end === false || $end <= $start) {
                return [];
            }
            $decoded = json_decode(substr($json, $start, $end - $start + 1), true);
        }

        $items = $decoded['candidates'] ?? $decoded;
        if (! is_array($items)) {
            return [];
        }

        $candidates = [];
        foreach ($items as $item) {
            if (! is_array($item) || empty($item['name'])) {
                continue;
            }

            $linkedinUrl = $this->normalizeLinkedinUrl((string) ($item['linkedin_url'] ?? ''));
            $linkedinId = trim((string) ($item['linkedin_id'] ?? ''));
            $candidateKey = $linkedinId ?: ($linkedinUrl ?: Str::slug($lead->company_name.'-'.$item['name'].'-'.$item['title']));

            $candidates[] = [
                'provider_candidate_id' => hash('sha256', strtolower($candidateKey)),
                'name' => trim((string) $item['name']),
                'title' => trim((string) ($item['title'] ?? '')),
                'company_name' => trim((string) ($item['company_name'] ?? $lead->company_name)),
                'company_domain' => $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST),
                'linkedin_url' => $linkedinUrl,
                'linkedin_id' => $linkedinId,
                'confidence_score' => max(0, min(100, (int) ($item['confidence_score'] ?? 60))),
                'relevance_reason' => trim((string) ($item['relevance_reason'] ?? '')),
                'evidence' => trim((string) ($item['evidence'] ?? '')),
                'raw_preview' => $item,
            ];
        }

        return $candidates;
    }

    private function normalizeLinkedinUrl(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        if (str_starts_with($url, 'linkedin.com/')) {
            $url = 'https://www.'.$url;
        } elseif (str_starts_with($url, 'www.linkedin.com/')) {
            $url = 'https://'.$url;
        }

        return str_contains($url, 'linkedin.com/') ? $url : null;
    }
}
