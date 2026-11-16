<?php

namespace App\Services\Lark;

use App\Models\Lead;
use App\Models\LeadTranscript;
use Exception;
use Illuminate\Support\Facades\Log;

class LarkDocsRenderer
{
    protected LarkDriveService $driveService;

    public function __construct(LarkDriveService $driveService)
    {
        $this->driveService = $driveService;
    }

    /**
     * Renders a native, high-performance block-based document structure for the Meeting Summary.
     */
    public function renderDoc(string $documentId, LeadTranscript $transcript, Lead $lead, ?string $imgFileToken = null): void
    {
        // 1. Fetch root block ID
        $docInfo = $this->driveService->request('GET', "/docx/v1/documents/{$documentId}");
        $rootBlockId = $docInfo['data']['document']['document_id'] ?? $documentId;

        // Clean up existing child blocks of root block to support safe retry recovery
        try {
            $existingBlocks = $this->driveService->request('GET', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [], ['page_size' => 500]);
            $childrenList = $existingBlocks['items'] ?? [];
            $childCount = count($childrenList);
            if ($childCount > 0) {
                $this->driveService->request('DELETE', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children/batch_delete", [
                    'start_index' => 0,
                    'end_index' => $childCount
                ]);
            }
        } catch (Exception $e) {
            Log::warning("Failed to clean up existing blocks for Lark Doc {$documentId}, appending instead", [
                'error' => $e->getMessage()
            ]);
        }

        $meetingType = $transcript->meeting_type ?: 'General';
        $typeKey = strtolower(str_replace([' ', '-'], '_', $meetingType));

        $general = $transcript->general_sections_json ?: [];
        $detailed = $transcript->detailed_insights_json ?: [];
        $conclusion = $transcript->conclusion_section_json ?: [];
        $meetingSpecific = $transcript->meeting_type_sections_json ?: [];
        $bantc = $transcript->bantc_json ?: [];
        $scoreUpdates = $transcript->score_updates_json ?: [];

        $children = [];

        // --- 1. HEADER SECTION ---
        $children[] = $this->heading1("MEETING SUMMARY — " . strtoupper($meetingType), 4);
        $dateStr = $transcript->recorded_at ? $transcript->recorded_at->format('d F Y H:i') : date('d F Y H:i');
        $children[] = $this->textBlock("AI-Powered Intelligence by Leadsy • Recorded: {$dateStr}", ['italic' => true, 'text_color' => 7]);
        $children[] = $this->divider();

        // --- 2. VISUAL SUMMARY IMAGE (if generated) ---
        if (!empty($imgFileToken)) {
            $children[] = [
                'block_type' => 27, // Image block
                'image' => [
                    'token' => $imgFileToken
                ]
            ];
            $children[] = $this->divider();
        }

        // --- 3. METADATA & LEAD OVERVIEW ---
        $children[] = $this->heading2("📋 Meeting & Lead Overview");
        $ownerName = $lead->owner ? $lead->owner->name : 'Unassigned';
        $industryName = $lead->industry ? $lead->industry->name : '-';
        $funnelStageName = $lead->funnelStage ? $lead->funnelStage->name : '-';
        $qualStatus = $lead->qualification_status ? ucfirst($lead->qualification_status) : '-';
        $companyName = $lead->company_name ?: ($lead->name ?: 'Unknown Lead');
        $productName = $lead->product ? $lead->product->name : 'LarkSuite';
        $leadScoreStr = $lead->lead_score ? (string)$lead->lead_score : 'N/A';

        $overviewLines = [
            "Company: {$companyName}",
            "Meeting Type: {$meetingType}",
            "Product: {$productName}",
            "Owner: {$ownerName}",
            "Lead Score: {$leadScoreStr}",
            "Industry: {$industryName}",
            "Funnel Stage: {$funnelStageName}",
            "Qualification: {$qualStatus}",
        ];
        foreach ($overviewLines as $line) {
            $children[] = $this->bulletItem($line);
        }
        $children[] = $this->divider();

        // --- 4. EXECUTIVE SUMMARY ---
        $children[] = $this->heading2("🎯 Executive Summary");
        $execSummaryText = $general['executive_summary'] ?? ($transcript->evaluations()->latest()->first()?->summary ?? 'No summary available.');
        $children[] = [
            'block_type' => 15, // Quote
            'quote' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => $execSummaryText,
                            'text_element_style' => ['italic' => true]
                        ]
                    ]
                ]
            ]
        ];

        // Overall sentiment
        $sentiment = $general['overall_sentiment'] ?? null;
        if ($sentiment && (isset($sentiment['positive']) || isset($sentiment['neutral']) || isset($sentiment['negative']))) {
            $pos = $sentiment['positive'] ?? 0;
            $neu = $sentiment['neutral'] ?? 0;
            $neg = $sentiment['negative'] ?? 0;
            $children[] = $this->textBlock(
                "Sentiment Breakdown: ✅ Positive {$pos}%  |  ⚠️ Neutral {$neu}%  |  ❌ Negative {$neg}%",
                ['bold' => true]
            );
        }
        $children[] = $this->divider();

        // --- 5. PRIMARY INSIGHTS ---
        $children[] = $this->heading2("💡 Primary Insights & Needs");

        $card1Title = 'Key Pain Points';
        $card1Data = $general['key_pain_points'] ?? ($general['customer_needs_pain_points'] ?? []);
        $card2Title = 'Customer Needs';
        $card2Data = $general['customer_needs'] ?? [];
        $card3Title = 'Key Discussions';
        $card3Data = $general['key_discussions'] ?? ($general['key_discussion_points'] ?? []);
        $card4Title = 'Decisions & Agreements';
        $card4Data = $general['decisions_agreements'] ?? ($general['decision_agreement'] ?? []);

        if ($typeKey === 'demo') {
            $card1Title = 'Features Demonstrated';
            $card1Data = $meetingSpecific['features_demonstrated'] ?? [];
            $card2Title = 'Customer Reactions';
            $card2Data = $meetingSpecific['customer_reactions'] ?? [];
            $card3Title = 'Questions & Objections';
            $card3Data = $meetingSpecific['questions_objections'] ?? [];
            $card4Title = 'Key Takeaways';
            $card4Data = $meetingSpecific['key_takeaways'] ?? [];
        } elseif ($typeKey === 'follow_up') {
            $card1Title = 'Previous Commitments';
            $card1Data = $meetingSpecific['previous_commitments'] ?? [];
            $card2Title = 'Completed Items';
            $card2Data = $meetingSpecific['completed_items'] ?? [];
            $card3Title = 'Pending Issues';
            $card3Data = $meetingSpecific['pending_issues'] ?? [];
            $card4Title = 'Updated Decisions';
            $card4Data = $meetingSpecific['updated_decisions'] ?? [];
        }

        $cards = [
            ['title' => $card1Title, 'items' => (array)$card1Data],
            ['title' => $card2Title, 'items' => (array)$card2Data],
            ['title' => $card3Title, 'items' => (array)$card3Data],
            ['title' => $card4Title, 'items' => (array)$card4Data],
        ];

        foreach ($cards as $card) {
            if (!empty($card['items'])) {
                $children[] = $this->textBlock($card['title'] . ":", ['bold' => true, 'text_color' => 4]);
                foreach (array_slice($card['items'], 0, 5) as $it) {
                    $val = is_array($it) ? json_encode($it) : (string)$it;
                    $children[] = $this->bulletItem($val);
                }
            }
        }
        $children[] = $this->divider();

        // --- 6. TOPICS DISCUSSED ---
        $topics = $detailed['topics_discussed'] ?? [];
        if (!empty($topics)) {
            $children[] = $this->heading2("🗣️ Topics Discussed");
            foreach (array_slice($topics, 0, 8) as $t) {
                $name = $t['topik'] ?? $t['topic'] ?? 'Topic';
                $summary = $t['ringkasan'] ?? $t['summary'] ?? '';
                $relevance = $t['relevansi'] ?? $t['relevance'] ?? '';
                $relText = $relevance ? " [Relevance: {$relevance}]" : "";
                $children[] = $this->bulletItem("{$name}{$relText}: {$summary}");
            }
            $children[] = $this->divider();
        }

        // --- 7. ACTION ITEMS ---
        $actionItems = $detailed['action_items'] ?? ($general['action_items'] ?? []);
        if (!empty($actionItems)) {
            $children[] = $this->heading2("✅ Action Items & Tasks");
            foreach (array_slice($actionItems, 0, 10) as $idx => $item) {
                $no = $idx + 1;
                $task = is_array($item) ? ($item['item'] ?? $item['task'] ?? 'Task') : (string)$item;
                $pic = is_array($item) ? ($item['pic'] ?? 'Unassigned') : 'Unassigned';
                $dueDate = is_array($item) ? ($item['due_date'] ?? 'TBD') : 'TBD';
                $status = is_array($item) ? ($item['status'] ?? 'Open') : 'Open';
                $children[] = $this->bulletItem("{$no}. {$task} — PIC: {$pic} | Due: {$dueDate} | Status: {$status}");
            }
            $children[] = $this->divider();
        }

        // --- 8. BANTC QUALIFICATION ---
        if (!empty($bantc)) {
            $children[] = $this->heading2("💰 BANTC Qualification");
            $b = $bantc['budget'] ?? 'Not specified';
            $a = $bantc['authority'] ?? 'Not specified';
            $n = $bantc['needs'] ?? 'Not specified';
            $t = $bantc['timeline'] ?? 'Not specified';
            $c = $bantc['competitor'] ?? 'Not specified';
            $children[] = $this->bulletItem("Budget: {$b}");
            $children[] = $this->bulletItem("Authority: {$a}");
            $children[] = $this->bulletItem("Needs: {$n}");
            $children[] = $this->bulletItem("Timeline: {$t}");
            $children[] = $this->bulletItem("Competitor: {$c}");
            $children[] = $this->divider();
        }

        // --- 9. CONCLUSION & NEXT STEPS ---
        $children[] = $this->heading2("🚀 Conclusion & Next Steps");
        $conclusionText = $conclusion['conclusion'] ?? 'No conclusion specified.';
        $nextStepVal = $conclusion['next_step'] ?? ($general['next_step'][0] ?? 'Follow-up with client');
        if (is_array($nextStepVal)) {
            $nextStepVal = implode(', ', $nextStepVal);
        }
        $children[] = [
            'block_type' => 15, // Quote
            'quote' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "CONCLUSION:\n{$conclusionText}\n\nIMMEDIATE NEXT STEP:\n{$nextStepVal}",
                            'text_element_style' => ['bold' => false]
                        ]
                    ]
                ]
            ]
        ];

        // --- 10. AI SCORE & RECOMMENDATION ---
        if (!empty($scoreUpdates) || !empty($transcript->presales_recommendation)) {
            $children[] = $this->divider();
            $children[] = $this->heading2("📊 AI Score & Presales Recommendation");
            if (!empty($scoreUpdates)) {
                $score = $scoreUpdates['lead_score'] ?? 'N/A';
                $eligibility = ucfirst($scoreUpdates['eligibility_status'] ?? 'N/A');
                $conf = $scoreUpdates['confidence'] ?? 'N/A';
                $children[] = $this->textBlock("Lead Score: {$score}  |  Eligibility: {$eligibility}  |  Confidence: {$conf}%", ['bold' => true]);
            }
            if (!empty($transcript->presales_recommendation)) {
                $children[] = $this->textBlock("Recommendation: " . $transcript->presales_recommendation, ['italic' => true]);
            }
        }

        // --- 11. FOOTER SECTION ---
        $children[] = $this->divider();
        $children[] = $this->textBlock(
            "Leadsy · Enterprise Sales Intelligence Operating System\nGenerated automatically via Leadsy AI Engine",
            ['text_color' => 7]
        );

        // 3. Batch send document blocks creation in chunks of max 25 blocks
        $chunks = array_chunk($children, 25);
        foreach ($chunks as $chunkIdx => $chunk) {
            $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [
                'children' => $chunk,
                'index' => -1
            ]);
            if ($chunkIdx < count($chunks) - 1) {
                usleep(250000); // 250ms delay between chunks to respect rate limit
            }
        }
    }

    // ─── Helper Methods ───────────────────────────────────────────────

    private function heading1(string $content, int $color = 0): array
    {
        $style = ['bold' => true];
        if ($color > 0) {
            $style['text_color'] = $color;
        }
        return [
            'block_type' => 3,
            'heading1' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => $content, 'text_element_style' => $style]]]
            ]
        ];
    }

    private function heading2(string $content): array
    {
        return [
            'block_type' => 4,
            'heading2' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => $content, 'text_element_style' => ['bold' => true]]]]
            ]
        ];
    }

    private function textBlock(string $content, array $style = []): array
    {
        $textRun = ['content' => $content];
        if (!empty($style)) {
            $textRun['text_element_style'] = $style;
        }
        return [
            'block_type' => 2,
            'text' => [
                'elements' => [['type' => 'text', 'text_run' => $textRun]]
            ]
        ];
    }

    private function bulletItem(string $content): array
    {
        return [
            'block_type' => 12,
            'bullet' => [
                'elements' => [['type' => 'text', 'text_run' => ['content' => $content]]]
            ]
        ];
    }

    private function divider(): array
    {
        return ['block_type' => 22, 'divider' => new \stdClass()];
    }
}
