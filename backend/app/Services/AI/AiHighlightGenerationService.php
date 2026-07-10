<?php

namespace App\Services\AI;

use App\Models\AiGeneratedOutput;
use App\Models\AiAttentionHighlight;

class AiHighlightGenerationService
{
    /**
     * Scan an AI output for specific high-impact keywords/patterns and log highlights
     */
    public function generateHighlightsForOutput(AiGeneratedOutput $output)
    {
        $json = $output->current_output_json ?? $output->original_output_json;
        if (!$json) {
            return;
        }

        // We check for an explicit "highlights" array first, if the prompt returned it
        if (isset($json['highlights']) && is_array($json['highlights'])) {
            foreach ($json['highlights'] as $hl) {
                AiAttentionHighlight::create([
                    'entity_type' => $output->entity_type,
                    'entity_id' => $output->entity_id,
                    'feature_key' => $output->feature_key,
                    'title' => $hl['title'] ?? 'Important Finding',
                    'category' => $hl['category'] ?? 'General',
                    'severity' => $hl['severity'] ?? 'medium',
                    'reason' => $hl['reason'] ?? '',
                    'evidence_json' => $hl['evidence'] ?? [],
                    'recommended_action' => $hl['recommended_action'] ?? '',
                    'status' => 'open',
                    'created_by_ai_output_id' => $output->id,
                ]);
            }
            return;
        }

        // Heuristic scanning if no explicit highlights block exists
        $this->scanAndCreate($output, $json);
    }

    private function scanAndCreate(AiGeneratedOutput $output, array $json)
    {
        $encoded = json_encode($json);
        $encodedLower = strtolower($encoded);

        // Simple heuristic rules
        $rules = [
            'critical_risk' => [
                'pattern' => ['deal breaker', 'critical risk', 'budget constraint', 'lost deal'],
                'category' => 'Critical Risk',
                'severity' => 'critical',
                'title' => 'Critical Risk Detected in AI Output',
            ],
            'high_revenue' => [
                'pattern' => ['high revenue opportunity', 'upsell', 'enterprise tier'],
                'category' => 'High Revenue Opportunity',
                'severity' => 'high',
                'title' => 'High Value Opportunity',
            ],
            'missing_info' => [
                'pattern' => ['missing information', 'unknown authority', 'decision maker missing'],
                'category' => 'Missing Information',
                'severity' => 'medium',
                'title' => 'Missing Key Qualification Data',
            ],
        ];

        foreach ($rules as $key => $rule) {
            foreach ($rule['pattern'] as $pattern) {
                if (str_contains($encodedLower, $pattern)) {
                    // Check if already exists for this output to avoid duplicates
                    $exists = AiAttentionHighlight::where('created_by_ai_output_id', $output->id)
                        ->where('category', $rule['category'])
                        ->exists();

                    if (!$exists) {
                        AiAttentionHighlight::create([
                            'entity_type' => $output->entity_type,
                            'entity_id' => $output->entity_id,
                            'feature_key' => $output->feature_key,
                            'title' => $rule['title'],
                            'category' => $rule['category'],
                            'severity' => $rule['severity'],
                            'reason' => "The AI detected patterns related to '{$pattern}'",
                            'evidence_json' => ['Scanned from output JSON'],
                            'recommended_action' => 'Review the full AI output and take appropriate action.',
                            'status' => 'open',
                            'created_by_ai_output_id' => $output->id,
                        ]);
                    }
                    break; // Move to next rule once one pattern matches
                }
            }
        }
    }
}
