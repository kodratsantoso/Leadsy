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
            'content' => $data['content'] ?? null,
            'system_prompt' => $data['system_prompt'] ?? null,
            'user_prompt' => $data['user_prompt'] ?? null,
            'output_contract_json' => $data['output_contract_json'] ?? null,
            'variables_schema_json' => $data['variables_schema_json'] ?? null,
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

    public function compilePrompt(string $featureName, string|array $input, array $variables = []): array|string
    {
        if (is_array($input)) {
            return $input;
        }

        $version = $this->getActiveVersionForFeature($featureName);
        if (! $version) {
            return $input;
        }

        $replacements = ['{{input}}' => $input];
        foreach ($variables as $key => $value) {
            $replacements['{{'.$key.'}}'] = is_scalar($value) ? (string) $value : json_encode($value, JSON_PRETTY_PRINT);
        }

        if ($version->system_prompt || $version->user_prompt) {
            $system = strtr((string) $version->system_prompt, $replacements);
            $user = strtr((string) $version->user_prompt, $replacements);
            
            return [
                'system' => str_contains($system, '{{input}}') ? str_replace('{{input}}', $input, $system) : $system,
                'user' => str_contains($user, '{{input}}') ? str_replace('{{input}}', $input, $user) : $user,
                'output_contract' => $version->output_contract_json,
            ];
        }

        $template = $version->content;
        $compiled = strtr((string) $template, $replacements);

        return str_contains($compiled, '{{input}}')
            ? str_replace('{{input}}', $input, $compiled)
            : $compiled;
    }

    public function previewPrompt(
        string $featureName,
        string $sampleInput,
        ?string $content = null,
        ?string $systemPrompt = null,
        ?string $userPrompt = null
    ): string|array {
        if (!empty($systemPrompt) || !empty($userPrompt)) {
            $sys = !empty($systemPrompt) ? (str_contains($systemPrompt, '{{input}}') ? str_replace('{{input}}', $sampleInput, $systemPrompt) : $systemPrompt) : '';
            $usr = !empty($userPrompt) ? (str_contains($userPrompt, '{{input}}') ? str_replace('{{input}}', $sampleInput, $userPrompt) : $userPrompt) : '';
            if (!empty($sys) && !str_contains($sys, '{{input}}') && !str_contains($usr, '{{input}}') && !empty($sampleInput)) {
                $usr = trim($usr . "\n\nInput:\n" . $sampleInput);
            }
            return [
                'system' => $sys,
                'user' => $usr,
            ];
        }

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
                'Detect customer intent, objections, sentiment, requirements, risks, and follow-up actions. Also extract BANTC values (Budget, Authority, Needs, Timeline, Competitor) if mentioned in the transcript. Ignore filler and avoid over-reading vague statements.',
                'Return only valid JSON matching the transcript evaluation schema requested by the feature prompt. bantc_extracted should be a nested object with keys: budget, authority, needs, timeline, competitor. Make sure to include eligibility_reason, presales_analysis, presales_recommendation, next_best_action, and estimated_closing_date (YYYY-MM-DD).'
            ),
            'activity_transcript_analysis' => $this->featureTemplate(
                'Activity Transcript Analysis',
                'Analyze a meeting transcript and extract comprehensive meeting notes, the outcome, and BANTC qualification variables.',
                'Use only the transcript text. Provide a detailed summary for the description. Determine if there is a clear outcome or next step. Extract Budget, Authority, Need, Timeline, and Competitor (BANTC) signals if mentioned.',
                'Return only valid JSON with keys: description, outcome, bantc. bantc must be an object with keys: budget, authority, needs, timeline, competitor.'
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
            'pre_meeting_brief_generation' => $this->featureTemplate(
                'Pre-Meeting Brief Generation',
                'Generate a structured sales preparation brief before a meeting.',
                'You are a high-level B2B sales strategist. You will be provided with Lead Context, Activities, BANTC, Transcripts, and Product Information. Analyze all these inputs carefully. Return ONLY raw JSON without any markdown formatting or code block markers. Do not invent facts outside of the given context.',
                'Return ONLY valid JSON with exactly the following top-level keys: summary (object), objective_hypothesis (object), strategy (object), questions (array of objects), demo_strategy (object), bantc_pre (object), pain_point (object), risk_analysis (object), readiness_score (integer between 0 and 100).'
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
            'dashboard_ai_insight' => $this->featureTemplate(
                'Dashboard AI Insight',
                'Analyze dashboard metrics and sales pipeline statistics to generate strategic executive insights for level C stakeholders.',
                'Highlight key performance indicators, explain what the numbers indicate, note critical points/blockers/risks, and offer 3-4 concrete strategic suggestions. Keep the tone professional, objective, and executive-ready. Answer in Indonesian language (Bahasa Indonesia).',
                'Return valid JSON with keys: explanation, strategic_suggestions, critical_points. Both strategic_suggestions and critical_points must be arrays of strings. Do not use markdown inside JSON fields.'
            ),
            'customer_journey_story' => $this->featureTemplate(
                'Customer Journey Story Generation',
                'Generate a clean, structured narrative summary of the end-to-end customer lifecycle.',
                'You will receive compiled Lead Context, Timeline Events, Meeting Intelligence, and Product Fit data. Combine these into a professional enterprise-toned consulting-style narrative. Explain why the customer came in, what problem they had, how the solution fits, and their current status. Do not use robotic repetition, internal debug language, or raw JSON keys in your narrative text.',
                'Return ONLY valid JSON with exactly one key: `story` (string). Do not return markdown, do not wrap in codeblocks.'
            ),
            'meeting_summary_general_prompt' => $this->featureTemplate(
                'Meeting Summary (General)',
                'Generate the base general meeting summary sections for any B2B customer interaction.',
                'Focus on extracting the Executive Summary, Key Discussion Points, Customer Needs/Pain Points, Decision/Agreement, Action Items, Risks/Concerns, Next Step, and Missing Information.',
                'Return a JSON object with: executive_summary (string), key_discussion_points (array of strings), customer_needs_pain_points (array of strings), decision_agreement (array of strings), action_items (array of strings), risks_concerns (array of strings), next_step (array of strings), missing_information (array of strings).'
            ),
            'meeting_summary_discovery_prompt' => $this->featureTemplate(
                'Meeting Summary (Discovery)',
                'Extract discovery-specific qualification insights, problem validation details, current processes, business needs, and decision readiness.',
                'Specifically validation of pain points, details of customer current processes, qualifications (BANTC), stakeholder insights, urgency signals, qualification results, and recommended next steps.',
                'Return a JSON object containing keys: customer_background (string), current_process (string), pain_point_validation (string), bantc (object with keys: budget, authority, needs, timeline, competitor), stakeholder_decision_maker_insight (string), urgency_signal (string), qualification_result (string), recommended_next_step (string).'
            ),
            'meeting_summary_demo_prompt' => $this->featureTemplate(
                'Meeting Summary (Demo)',
                'Extract demo objectives, demonstrated features, customer reactions, relevant use cases, product fit analysis, gap/concerns, demo outcomes, and recommended follow-up actions.',
                'Focus heavily on product fit, customer reactions to demo features, gaps identified, and follow-up activities.',
                'Return a JSON object containing keys: demo_objective (string), products_features_demonstrated (array of strings), customer_reaction (string), relevant_use_cases (array of strings), product_fit_analysis (string), feature_interest (array of strings), gaps_concerns (array of strings), demo_outcome (string), recommended_follow_up_action (string).'
            ),
            'meeting_summary_follow_up_prompt' => $this->featureTemplate(
                'Meeting Summary (Follow-up)',
                'Extract follow-up progress, recaps, updated requirements, blockers, feedback, pending actions, decision changes, and recommended next steps.',
                'Focus on tracking progress against past commitments, blockers, and feedback.',
                'Return a JSON object containing keys: previous_meeting_recap (string), progress_update (string), updated_requirement (string), open_blockers (array of strings), customer_feedback (string), pending_action_items (array of strings), decision_changes (array of strings), recommended_next_step (string).'
            ),
            'meeting_summary_proposal_discussion_prompt' => $this->featureTemplate(
                'Meeting Summary (Proposal Discussion)',
                'Extract proposed scope, pricing/packaging details, commercial objections, scope concerns, approval processes, legal considerations, proposal risks, required revisions, and recommended closing strategies.',
                'Focus on commercial terms, negotiation details, pricing discussions, and legal/procurement next steps.',
                'Return a JSON object containing keys: proposed_scope (string), pricing_package_discussion (string), commercial_objection (array of strings), scope_concern (array of strings), approval_process (string), procurement_legal_consideration (string), proposal_risk (array of strings), required_revision (array of strings), recommended_closing_strategy (string).'
            ),
            'meeting_summary_closing_discussion_prompt' => $this->featureTemplate(
                'Meeting Summary (Closing Discussion)',
                'Extract closing status, final decision signals, remaining blockers, legal/procurement status, commercial agreements, expected closing timelines, required internal actions, deal risks, and next steps to contract/sales order.',
                'Focus on contract completion steps, closing timeline commitments, final blockers, and legal signing status.',
                'Return a JSON object containing keys: closing_status (string), final_decision_signal (string), remaining_blockers (array of strings), legal_procurement_status (string), commercial_agreement (string), expected_closing_timeline (string), required_internal_action (array of strings), deal_risk (array of strings), next_step_to_contract_sales_order (string).'
            ),
            'meeting_summary_handover_csm_prompt' => $this->featureTemplate(
                'Meeting Summary (Handover to CSM)',
                'Extract post-sales transition scope, customer expectations, key stakeholders, success criteria, implementation notes, adoption risks, pending sales commitments, CSM attention points, and recommended onboarding actions.',
                'Focus on transition details, implementation roadmap, onboarding plans, adoption risks, and CSM priority tasks.',
                'Return a JSON object containing keys: agreed_scope (string), customer_expectation (string), key_stakeholders (array of strings), success_criteria (string), implementation_notes (string), adoption_risk (array of strings), pending_sales_commitment (array of strings), csm_attention_points (array of strings), recommended_onboarding_action (string).'
            ),
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
