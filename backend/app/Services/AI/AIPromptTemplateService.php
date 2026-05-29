<?php

namespace App\Services\AI;

use App\Models\AiPromptTemplate;
use App\Models\AiPromptTemplateVersion;
use App\Services\AuditService;
use Illuminate\Support\Collection;

class AIPromptTemplateService
{
    public function ensureDefaults(): void
    {
        foreach ($this->defaultTemplates() as $featureName => $content) {
            $template = AiPromptTemplate::firstOrCreate(
                ['feature_name' => $featureName, 'template_name' => 'Default'],
                ['description' => 'System-managed default prompt wrapper', 'is_active' => true]
            );

            if (! $template->versions()->exists()) {
                $version = $template->versions()->create([
                    'version' => 1,
                    'content' => $content,
                    'is_active' => true,
                    'is_enabled' => true,
                ]);

                $template->forceFill(['active_version_id' => $version->id])->save();
            }
        }
    }

    public function listTemplates(): Collection
    {
        $this->ensureDefaults();

        return AiPromptTemplate::with(['activeVersion', 'versions' => fn ($query) => $query->latest('version')])
            ->orderBy('feature_name')
            ->orderBy('template_name')
            ->get();
    }

    public function createVersion(array $data, ?int $userId = null): AiPromptTemplateVersion
    {
        $this->ensureDefaults();

        $template = AiPromptTemplate::firstOrCreate(
            ['feature_name' => $data['feature_name'], 'template_name' => $data['template_name'] ?? 'Default'],
            [
                'description' => $data['description'] ?? null,
                'is_active' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]
        );

        $nextVersion = ((int) $template->versions()->max('version')) + 1;

        $version = $template->versions()->create([
            'version' => $nextVersion,
            'content' => $data['content'],
            'is_active' => false,
            'is_enabled' => true,
            'created_by' => $userId,
        ]);

        $template->forceFill([
            'description' => $data['description'] ?? $template->description,
            'updated_by' => $userId,
        ])->save();

        AuditService::log(
            'prompt_version_created',
            'ai_prompt_templates',
            $template,
            null,
            ['feature_name' => $template->feature_name, 'version_id' => $version->id, 'version' => $version->version],
        );

        return $version->load('template');
    }

    public function activateVersion(AiPromptTemplateVersion $version, ?int $userId = null): AiPromptTemplateVersion
    {
        $template = $version->template;

        $template->versions()->update(['is_active' => false]);
        $version->forceFill([
            'is_active' => true,
            'activated_by' => $userId,
            'activated_at' => now(),
        ])->save();

        $template->forceFill([
            'active_version_id' => $version->id,
            'updated_by' => $userId,
        ])->save();

        AuditService::log(
            'prompt_version_activated',
            'ai_prompt_templates',
            $template,
            null,
            ['feature_name' => $template->feature_name, 'version_id' => $version->id, 'version' => $version->version],
        );

        return $version->fresh(['template']);
    }

    public function getActiveVersionForFeature(string $featureName): ?AiPromptTemplateVersion
    {
        $this->ensureDefaults();

        $template = AiPromptTemplate::with('activeVersion')
            ->where('feature_name', $featureName)
            ->where('is_active', true)
            ->first();

        return $template?->activeVersion;
    }

    public function compilePrompt(string $featureName, string $input, array $variables = []): string
    {
        $version = $this->getActiveVersionForFeature($featureName);
        if (! $version) {
            return $input;
        }

        $template = $version->content;
        $replacements = ['{{input}}' => $input];

        foreach ($variables as $key => $value) {
            $replacements['{{'.$key.'}}'] = is_scalar($value) ? (string) $value : json_encode($value, JSON_PRETTY_PRINT);
        }

        $compiled = strtr($template, $replacements);

        return str_contains($compiled, '{{input}}')
            ? str_replace('{{input}}', $input, $compiled)
            : $compiled;
    }

    public function previewPrompt(string $featureName, string $sampleInput, ?string $content = null): string
    {
        if ($content !== null) {
            return str_contains($content, '{{input}}')
                ? str_replace('{{input}}', $sampleInput, $content)
                : trim($content."\n\nInput:\n".$sampleInput);
        }

        return $this->compilePrompt($featureName, $sampleInput);
    }

    protected function defaultTemplates(): array
    {
        return [
            'lead_analysis' => $this->featureTemplate(
                'Lead Analysis',
                'Analyze a lead/company profile and produce concise sales intelligence for Indonesian B2B users.',
                'Use only the provided lead facts, source signals, enrichment data, and product context. Highlight business opportunity, risks, missing data, and next action without inventing facts.',
                'Return the exact schema requested in the feature prompt. Keep reasoning short, evidence-backed, and deterministic.'
            ),
            'lead_scoring' => $this->featureTemplate(
                'Lead Scoring Analysis',
                'Score a lead from 0-100 and classify its qualification status for prioritization.',
                'Consider data completeness, source reliability, product fit, company scale, contactability, and buying signals. Penalize missing or weak evidence instead of guessing.',
                'Return only valid JSON with score, qualification_status, and explanation as requested by the feature prompt.'
            ),
            'qualification_analysis' => $this->featureTemplate(
                'Qualification Analysis',
                'Evaluate whether a lead is eligible, potential, or not eligible based on BANTC-style qualification signals.',
                'Separate known facts from assumptions. Explain blockers such as missing budget, authority, need, timeline, contact, or product fit evidence.',
                'Return only valid JSON matching the feature prompt schema.'
            ),
            'product_matching' => $this->featureTemplate(
                'Product Matching Analysis',
                'Compare a lead against a specific product and estimate product fit.',
                'Reason from lead industry, company size, geography, pain points, available product metadata, and source confidence. Do not invent use cases or requirements.',
                'Return only valid JSON with calibrated fit score, matched signals, gaps, and recommended approach.'
            ),
            'product_understanding' => $this->featureTemplate(
                'Product Understanding',
                'Extract structured product intelligence from product reference text, URL content, or documents.',
                'Identify target industries, pain points, buyer personas, use cases, competitive advantages, and ICP signals only from supplied material.',
                'Return structured JSON requested by the feature prompt. Do not add unsupported categories.'
            ),
            'icp_generation' => $this->featureTemplate(
                'ICP Profile Generation',
                'Generate Ideal Customer Profile suggestions from the active product portfolio.',
                'Use only provided product data. Synthesize target industries, company sizes, territories, pain points, buyer personas, scoring weights, and rationale.',
                'Return only valid JSON with ICP profile suggestions. Do not invent unsupported industries, regions, or product capabilities.'
            ),
            'meeting_evaluation' => $this->featureTemplate(
                'Meeting Evaluation',
                'Evaluate meeting notes or summaries for sales intent, objections, buying signals, and next action.',
                'Extract what was actually discussed. Keep sentiment and intent calibrated when the meeting content is thin or ambiguous.',
                'Return only valid JSON matching the feature prompt schema.'
            ),
            'conversation_evaluation' => $this->featureTemplate(
                'Conversation Evaluation',
                'Evaluate a sales interaction from transcript, meeting, call, WhatsApp, or manual notes.',
                'Classify sentiment, intent, interest, objections, buying signals, next best action, and confidence using only the interaction text.',
                'Return only valid JSON with sentiment, intent_level, interest_level, objections_detected, buying_signals, next_best_action, and confidence_score.'
            ),
            'transcript_evaluation' => $this->featureTemplate(
                'Transcript Evaluation',
                'Extract structured insights from a meeting or call transcript.',
                'Detect customer intent, objections, sentiment, requirements, risks, and follow-up actions. Ignore filler and avoid over-reading vague statements.',
                'Return only valid JSON matching the transcript evaluation schema requested by the feature prompt.'
            ),
            'next_action_recommendation' => $this->featureTemplate(
                'Next Action Recommendation',
                'Recommend the safest next sales action for a lead or opportunity.',
                'Prioritize practical actions based on current stage, qualification state, score, contactability, objections, and recent activities.',
                'Return only valid JSON when requested. Include concise rationale and avoid generic advice.'
            ),
            'recommendation_engine' => $this->featureTemplate(
                'Recommendation Engine',
                'Generate explainable recommendations for the configured Leadsy feature.',
                'Use the supplied context and feature goal only. Prefer low-regret, operationally clear recommendations that a sales team can act on.',
                'Return only valid JSON matching the feature prompt schema.'
            ),
            'summary_generation' => $this->featureTemplate(
                'Summary Generation',
                'Summarize lead, activity, meeting, transcript, or workflow context for quick user review.',
                'Stay factual, concise, and source-grounded. Preserve important names, dates, objections, and next actions when present.',
                'Return the requested output format. If JSON is requested, return only valid JSON.'
            ),
            'revenue_intelligence_analysis' => $this->featureTemplate(
                'Revenue Intelligence Analysis',
                'Assess buying intent, urgency, probability to close, business use case, objections, and recommended approach.',
                'Use lead data, activities, meetings, transcripts, qualification, product signals, and revenue outcomes only. Lower confidence when evidence is sparse.',
                'Return only valid JSON matching the revenue analysis schema.'
            ),
            'whatsapp_analysis' => $this->featureTemplate(
                'WhatsApp Analysis',
                'Analyze WhatsApp conversation content for commercial relevance and sales intent.',
                'Detect buying signals, objections, urgency, sentiment, and suggested response. Do not store or infer unrelated personal content.',
                'Return only valid JSON matching the WhatsApp analysis schema.'
            ),
            'product_metadata_generation' => $this->featureTemplate(
                'Product Metadata Generation',
                'Generate structured B2B product metadata for Leadsy from a product name, URL, PDF, or reference text.',
                'Choose categories only from the supplied category list. Generate realistic ICP, pain points, buyer personas, use cases, budget range, keywords, and qualification cues.',
                'Return only valid JSON with no markdown, using the exact product metadata schema requested by the feature prompt.'
            ),
            'geo_product_fit_analysis' => $this->featureTemplate(
                'Geo Product Fit Analysis',
                'Evaluate fit between a discovered business location and a product ICP.',
                'Use only supplied Google Maps/place data and product metadata. Consider category relevance, scale signals, web presence, region fit, buyer persona likelihood, budget fit, risk flags, and missing information.',
                'Return only valid JSON with fit_score, fit_level, confidence_score, reasoning, matched_signals, missing_information, recommended_approach, recommended_next_action, potential_use_case, and risk_flags.'
            ),
            'product_question_generation' => $this->featureTemplate(
                'Product Question Guide Generation',
                'Generate a sales/presales discovery question guide for a product.',
                'Create open-ended questions across current state, requirements, budget and timeline, decision process, technical fit, and competition. Make questions relevant to supplied product metadata.',
                'Return only valid JSON with a questions array. Each item must include id, text, category, and order.'
            ),
            'lead_bantc_question_generation' => $this->featureTemplate(
                'Lead BANTC Question Guide Generation',
                'Generate a lead-specific BANTC discovery question guide.',
                'Use the supplied lead, product, contact, source, score, qualification, activity, and revenue signals. Include practical questions for Budget, Authority, Need, Timeline, and Competition.',
                'Return only valid JSON with a questions array. Each item must include id, text, category, and order.'
            ),
            'lead_contact_google_search_keyword' => 'site:linkedin.com/in "{{company_name}}" ("manager" OR "director" OR "head" OR "general manager" OR "finance" OR "operations" OR "procurement" OR "IT" OR "sales")',
        ];
    }

    private function featureTemplate(string $role, string $objective, string $rules, string $outputContract): string
    {
        return <<<PROMPT
Role:
You are the Leadsy {$role} AI.

Objective:
{$objective}

Operating Rules:
- Use only evidence supplied in the feature input.
- Keep outputs factual, deterministic, and useful for an Indonesian B2B sales team.
- Do not invent names, URLs, email addresses, phone numbers, revenue, company facts, or product capabilities.
- Clearly lower confidence when source data is incomplete, ambiguous, or inferred.
- Prefer concise explanations tied to observable evidence.

Feature-Specific Rules:
{$rules}

Output Contract:
{$outputContract}

Feature input:
{{input}}
PROMPT;
    }
}
