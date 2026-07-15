<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use App\Models\AiGeneratedOutput;
use App\Models\AiOutputVersion;
use App\Services\AI\AiOrchestrationService;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MeetingSummaryGenerationService
{
    public function __construct(
        private AiOrchestrationService $ai,
        private AIPromptTemplateService $promptTemplates
    ) {}

    public function generate(LeadTranscript $transcript): array
    {
        $lead = $transcript->lead;
        if (!$lead) {
            throw new \Exception("Lead not found for transcript ID: {$transcript->id}");
        }

        // Resolve meeting type (e.g. Discovery, Demo, Follow-up, etc.)
        $meetingType = $transcript->meeting_type ?: 'General';
        
        // Map meeting type to its specific prompt key
        $typePromptKey = match (strtolower(str_replace([' ', '-'], '_', $meetingType))) {
            'discovery' => 'meeting_summary_discovery_prompt',
            'demo' => 'meeting_summary_demo_prompt',
            'follow_up' => 'meeting_summary_follow_up_prompt',
            'proposal_discussion' => 'meeting_summary_proposal_discussion_prompt',
            'closing_discussion' => 'meeting_summary_closing_discussion_prompt',
            'handover_to_csm' => 'meeting_summary_handover_csm_prompt',
            default => null
        };

        Log::info("Generating meeting summary for transcript ID {$transcript->id} using meeting type: {$meetingType}");

        // Load general prompt template
        $generalVersion = $this->promptTemplates->getActiveVersionForFeature('meeting_summary_general_prompt');
        
        // Load meeting type-specific prompt template if applicable
        $typeVersion = null;
        if ($typePromptKey) {
            $typeVersion = $this->promptTemplates->getActiveVersionForFeature($typePromptKey);
        }

        // Build composite prompt instructions
        $systemPrompt = "You are a Leadsy B2B enterprise sales analyst.\n\n" . 
            "Analyze the following meeting transcript and extract structured intelligence.\n\n" .
            "Requirements:\n" .
            "1. Extract the general meeting summary sections.\n";
        
        if ($typeVersion) {
            $systemPrompt .= "2. Since this is a {$meetingType} meeting, extract the specific {$meetingType} sections.\n";
        }
        
        $systemPrompt .= "3. Format your output strictly in the requested JSON structure.\n" .
            "4. If there is not enough evidence for any section, write 'Not available' or list it under missing information. DO NOT invent or hallucinate facts.\n\n" .
            "--- GENERAL SUMMARY SYSTEM PROMPT ---\n" . ($generalVersion?->system_prompt ?? '') . "\n\n";

        if ($typeVersion) {
            $systemPrompt .= "--- TYPE-SPECIFIC SYSTEM PROMPT ---\n" . ($typeVersion?->system_prompt ?? '') . "\n\n";
        }

        $userPrompt = "Company: {$lead->company_name}\n" .
            "Industry: " . ($lead->industry?->name ?? 'Not specified') . "\n" .
            "Meeting Type: {$meetingType}\n\n" .
            "Transcript:\n" . $transcript->transcript_text . "\n\n" .
            "Return a JSON object that satisfies this schema structure:\n" .
            "{\n" .
            "  \"meeting_type\": \"{$meetingType}\",\n" .
            "  \"summary_type\": \"" . ($typePromptKey ? $meetingType : 'General') . "\",\n" .
            "  \"general_sections\": {\n" .
            "    \"executive_summary\": \"string\",\n" .
            "    \"key_discussion_points\": [\"string\"],\n" .
            "    \"customer_needs_pain_points\": [\"string\"],\n" .
            "    \"decision_agreement\": [\"string\"],\n" .
            "    \"action_items\": [\"string\"],\n" .
            "    \"risks_concerns\": [\"string\"],\n" .
            "    \"next_step\": [\"string\"],\n" .
            "    \"missing_information\": [\"string\"]\n" .
            "  },\n" .
            "  \"meeting_type_sections\": " . ($typePromptKey ? "{\n    // Meeting type specific fields for {$meetingType}\n  }" : "{}") . ",\n" .
            "  \"bantc\": {\n" .
            "    \"budget\": \"string\",\n" .
            "    \"authority\": \"string\",\n" .
            "    \"needs\": \"string\",\n" .
            "    \"timeline\": \"string\",\n" .
            "    \"competitor\": \"string\"\n" .
            "  },\n" .
            "  \"score_updates\": {\n" .
            "    \"lead_score\": \"integer (null if not determined)\",\n" .
            "    \"eligibility_status\": \"string ('eligible', 'potential', 'not_eligible')\",\n" .
            "    \"confidence\": \"integer (0-100)\"\n" .
            "  },\n" .
            "  \"presales_recommendation\": \"string\"\n" .
            "}\n\n" .
            "General prompt rules:\n" . ($generalVersion?->user_prompt ?? '') . "\n\n";

        if ($typeVersion) {
            $userPrompt .= "Type-specific rules:\n" . ($typeVersion?->user_prompt ?? '') . "\n\n";
        }

        $userPrompt .= "Return ONLY the raw JSON string, without markdown formatting, code block ticks, or any text wrapper.";

        // Execute AI Call using routing
        $result = $this->ai->call('global', [
            'system' => $systemPrompt,
            'user' => $userPrompt,
        ]);

        if (!$result['success'] || empty($result['content'])) {
            throw new \Exception("AI meeting summary generation failed: " . ($result['error'] ?? 'Empty response'));
        }

        $parsed = $this->parseJson($result['content']);
        if (!$parsed) {
            Log::error("Failed to parse JSON output from AI: " . $result['content']);
            throw new \Exception("AI generated output is not valid JSON.");
        }

        // Fill metadata
        $parsed['metadata'] = [
            'generated_at' => Carbon::now()->toIso8601String(),
            'prompt_template_key' => $typePromptKey ?: 'meeting_summary_general_prompt',
            'prompt_version' => $typeVersion ? (string)$typeVersion->version : (string)($generalVersion?->version ?? 1),
            'ai_provider' => $result['provider'] ?? ($result['model'] ?? 'AI Provider'),
            'ai_model' => $result['model'] ?? 'AI Model',
        ];

        // Save to lead_transcripts table columns
        $transcript->update([
            'summary_type' => $parsed['summary_type'] ?? ($typePromptKey ? $meetingType : 'General'),
            'general_sections_json' => $parsed['general_sections'] ?? null,
            'meeting_type_sections_json' => $parsed['meeting_type_sections'] ?? null,
            'bantc_json' => $parsed['bantc'] ?? null,
            'score_updates_json' => $parsed['score_updates'] ?? null,
            'presales_recommendation' => $parsed['presales_recommendation'] ?? null,
            'prompt_template_key' => $parsed['metadata']['prompt_template_key'],
            'prompt_version' => $parsed['metadata']['prompt_version'],
            'ai_provider' => $parsed['metadata']['ai_provider'],
            'ai_model' => $parsed['metadata']['ai_model'],
            'generated_at' => Carbon::now(),
        ]);

        // Save to lead_ai_evaluations table
        $aiEvaluation = LeadAiEvaluation::updateOrCreate([
            'source_type' => LeadTranscript::class,
            'source_id' => $transcript->id,
        ], [
            'lead_id' => $lead->id,
            'sentiment' => 'neutral',
            'intent_level' => $parsed['score_updates']['eligibility_status'] ?? 'medium',
            'interest_level' => 'medium',
            'summary' => $parsed['general_sections']['executive_summary'] ?? '',
            'objections_detected' => $parsed['general_sections']['customer_needs_pain_points'] ?? [],
            'buying_signals' => $parsed['general_sections']['key_discussion_points'] ?? [],
            'bantc_extracted' => $parsed['bantc'] ?? null,
            'eligibility_reason' => $parsed['score_updates']['eligibility_status'] ?? '',
            'presales_analysis' => $parsed['presales_recommendation'] ?? '',
            'presales_recommendation' => $parsed['presales_recommendation'] ?? '',
            'next_best_action' => $parsed['general_sections']['next_step'][0] ?? 'Follow-up',
            'confidence_score' => (int)($parsed['score_updates']['confidence'] ?? 80),
            'challenge' => $parsed['general_sections']['customer_needs_pain_points'][0] ?? '',
            'risks' => $parsed['general_sections']['risks_concerns'] ?? [],
            'action_items' => $parsed['general_sections']['action_items'] ?? [],
            'missing_information' => $parsed['general_sections']['missing_information'] ?? [],
            'evaluated_at' => Carbon::now(),
        ]);

        // Save to ai_generated_outputs table for version history
        $aiOutput = AiGeneratedOutput::updateOrCreate([
            'entity_type' => LeadTranscript::class,
            'entity_id' => $transcript->id,
            'feature_key' => 'meeting_summary_generation',
        ], [
            'original_output_json' => $parsed,
            'current_output_json' => $parsed,
            'status' => 'draft',
            'ai_provider' => $parsed['metadata']['ai_provider'],
            'ai_model' => $parsed['metadata']['ai_model'],
            'prompt_version' => $parsed['metadata']['prompt_version'],
            'generated_at' => Carbon::now(),
        ]);

        // Create version record
        $versionNumber = $aiOutput->versions()->count() + 1;
        AiOutputVersion::create([
            'ai_output_id' => $aiOutput->id,
            'version_number' => $versionNumber,
            'output_json' => $parsed,
            'change_summary' => 'AI Generated',
            'change_type' => 'generated',
        ]);

        // Update lead scoring/BANT-C if updates are present
        if (!empty($parsed['bantc'])) {
            $lead->update([
                'budget' => $parsed['bantc']['budget'] ?? $lead->budget,
                'authority' => $parsed['bantc']['authority'] ?? $lead->authority,
                'needs' => $parsed['bantc']['needs'] ?? $lead->needs,
                'timeline' => $parsed['bantc']['timeline'] ?? $lead->timeline,
                'competitor' => $parsed['bantc']['competitor'] ?? $lead->competitor,
            ]);

            // Save to Lead Activity Log
            $lead->activities()->create([
                'activity_type' => 'Meeting Analysis',
                'description' => 'AI extracted BANTC qualification fields from meeting transcript. Meeting Type: ' . $meetingType,
                'budget' => $parsed['bantc']['budget'] ?? null,
                'authority' => $parsed['bantc']['authority'] ?? null,
                'needs' => $parsed['bantc']['needs'] ?? null,
                'timeline' => $parsed['bantc']['timeline'] ?? null,
                'competitor' => $parsed['bantc']['competitor'] ?? null,
                'activity_date' => now(),
            ]);
        }

        if (!empty($parsed['score_updates'])) {
            $score = $parsed['score_updates']['lead_score'] ?? null;
            $eligibility = $parsed['score_updates']['eligibility_status'] ?? null;
            if ($score !== null || $eligibility !== null) {
                $lead->update(array_filter([
                    'lead_score' => $score !== null ? (int)$score : $lead->lead_score,
                    'qualification_status' => $eligibility ?: $lead->qualification_status,
                ]));
            }
        }

        return $parsed;
    }

    private function parseJson(string $content): ?array
    {
        $content = trim($content);
        if (str_starts_with($content, '```json')) {
            $content = substr($content, 7);
            if (str_ends_with($content, '```')) {
                $content = substr($content, 0, -3);
            }
        } elseif (str_starts_with($content, '```')) {
            $content = substr($content, 3);
            if (str_ends_with($content, '```')) {
                $content = substr($content, 0, -3);
            }
        }
        $content = trim($content);
        $decoded = json_decode($content, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    }
}
