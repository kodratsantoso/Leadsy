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
     * Renders a native block-based document structure for the Meeting Summary.
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

        // Track table indices for later cell population
        $tableIndex = 0;
        $tableMap = []; // key => table index

        // --- 1. HEADER SECTION ---
        $children[] = $this->heading1("MEETING SUMMARY - " . strtoupper($meetingType), 4);
        $children[] = $this->textBlock("AI-Powered Summary by Leadsy", ['italic' => true]);
        $children[] = $this->divider();

        // --- 2. METADATA SECTION (TABLE 3×3) ---
        $dateStr = $transcript->recorded_at ? $transcript->recorded_at->format('d F Y') : '-';
        $ownerName = $lead->owner ? $lead->owner->name : 'Unassigned';
        $industryName = $lead->industry ? $lead->industry->name : '-';
        $funnelStageName = $lead->funnelStage ? $lead->funnelStage->name : '-';
        $qualStatus = $lead->qualification_status ? ucfirst($lead->qualification_status) : '-';

        $children[] = [
            'block_type' => 31, // Table
            'table' => ['property' => ['row_size' => 3, 'column_size' => 3, 'column_width' => [320, 320, 320]]]
        ];
        $tableMap['metadata'] = $tableIndex++;

        $metaCells = [
            // Row 1
            ['title' => 'Meeting Type', 'val' => $meetingType],
            ['title' => 'Product', 'val' => $lead->product ? $lead->product->name : 'LarkSuite'],
            ['title' => 'Company', 'val' => $lead->company_name ?: 'Unknown Company'],
            // Row 2
            ['title' => 'Date & Time', 'val' => $dateStr],
            ['title' => 'Owner', 'val' => $ownerName],
            ['title' => 'Lead Score', 'val' => $lead->lead_score ? (string)$lead->lead_score : 'N/A'],
            // Row 3
            ['title' => 'Industry', 'val' => $industryName],
            ['title' => 'Funnel Stage', 'val' => $funnelStageName],
            ['title' => 'Qualification', 'val' => $qualStatus],
        ];

        // --- 3. EXECUTIVE SUMMARY ---
        $execSummaryText = $general['executive_summary'] ?? 'No summary available.';
        $children[] = [
            'block_type' => 15, // Quote
            'quote' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "EXECUTIVE SUMMARY\n" . $execSummaryText,
                            'text_element_style' => ['italic' => true]
                        ]
                    ]
                ]
            ]
        ];

        // --- 3b. OVERALL SENTIMENT ---
        $sentiment = $general['overall_sentiment'] ?? null;
        if ($sentiment && (isset($sentiment['positive']) || isset($sentiment['neutral']) || isset($sentiment['negative']))) {
            $pos = $sentiment['positive'] ?? 0;
            $neu = $sentiment['neutral'] ?? 0;
            $neg = $sentiment['negative'] ?? 0;
            $children[] = $this->textBlock(
                "Sentiment:  ✅ Positive {$pos}%  |  ⚠️ Neutral {$neu}%  |  ❌ Negative {$neg}%",
                ['bold' => true]
            );
        }

        $children[] = $this->divider();

        // --- 4. PRIMARY INSIGHTS CARDS (TABLE) ---
        $card1Title = 'KEY PAIN POINTS';
        $card1Data = $general['key_pain_points'] ?? [];
        $card2Title = 'CUSTOMER NEEDS';
        $card2Data = $general['customer_needs'] ?? [];
        $card3Title = 'KEY DISCUSSIONS';
        $card3Data = $general['key_discussions'] ?? [];
        $card4Title = 'DECISIONS & AGREEMENTS';
        $card4Data = $general['decisions_agreements'] ?? $general['decisions'] ?? [];

        if ($typeKey === 'demo') {
            $card1Title = 'FEATURES DEMONSTRATED';
            $card1Data = $meetingSpecific['features_demonstrated'] ?? [];
            $card2Title = 'CUSTOMER REACTIONS';
            $card2Data = $meetingSpecific['customer_reactions'] ?? [];
            $card3Title = 'QUESTIONS & OBJECTIONS';
            $card3Data = $meetingSpecific['questions_objections'] ?? [];
            $card4Title = 'KEY TAKEAWAYS';
            $card4Data = $meetingSpecific['key_takeaways'] ?? [];
        } elseif ($typeKey === 'follow_up') {
            $card1Title = 'PREVIOUS COMMITMENTS';
            $card1Data = $meetingSpecific['previous_commitments'] ?? [];
            $card2Title = 'COMPLETED ITEMS';
            $card2Data = $meetingSpecific['completed_items'] ?? [];
            $card3Title = 'PENDING ISSUES';
            $card3Data = $meetingSpecific['pending_issues'] ?? [];
            $card4Title = 'UPDATED DECISIONS';
            $card4Data = $meetingSpecific['updated_decisions'] ?? [];
        } elseif ($typeKey === 'proposal_discussion') {
            $card1Title = 'SCOPE DISCUSSION';
            $card1Data = $meetingSpecific['scope_discussion'] ?? [];
            $card2Title = 'COMMERCIAL FEEDBACK';
            $card2Data = $meetingSpecific['commercial_feedback'] ?? [];
            $card3Title = 'NEGOTIATION POINTS';
            $card3Data = $meetingSpecific['negotiation_points'] ?? [];
            $card4Title = 'AGREEMENTS & PENDING';
            $card4Data = $meetingSpecific['agreements_pending'] ?? [];
        } elseif ($typeKey === 'closing_discussion') {
            $card1Title = 'FINAL OBJECTIONS';
            $card1Data = $meetingSpecific['final_objections'] ?? [];
            $card2Title = 'DECISION STATUS';
            $card2Data = $meetingSpecific['decision_status'] ?? [];
            $card3Title = 'COMMERCIAL READINESS';
            $card3Data = $meetingSpecific['commercial_readiness'] ?? [];
            $card4Title = 'CLOSING AGREEMENTS';
            $card4Data = $meetingSpecific['closing_agreements'] ?? [];
        } elseif ($typeKey === 'handover_to_csm') {
            $card1Title = 'CUSTOMER PROFILE';
            $card1Data = $meetingSpecific['customer_profile'] ?? [];
            $card2Title = 'PURCHASED SCOPE';
            $card2Data = $meetingSpecific['purchased_scope'] ?? [];
            $card3Title = 'KEY STAKEHOLDERS';
            $card3Data = $meetingSpecific['key_stakeholders'] ?? [];
            $card4Title = 'RISKS & OPEN ITEMS';
            $card4Data = $meetingSpecific['risks_open_items'] ?? [];
        }

        $children[] = $this->heading1('PRIMARY INSIGHTS');

        $children[] = [
            'block_type' => 31,
            'table' => ['property' => ['row_size' => 2, 'column_size' => 2, 'column_width' => [480, 480]]]
        ];
        $tableMap['insights'] = $tableIndex++;

        $insightCells = [
            ['title' => $card1Title, 'content' => $this->formatList($card1Data)],
            ['title' => $card2Title, 'content' => $this->formatList($card2Data)],
            ['title' => $card3Title, 'content' => $this->formatList($card3Data)],
            ['title' => $card4Title, 'content' => $this->formatList($card4Data)],
        ];

        // --- 5. DETAILED INSIGHTS & ACTION PLAN ---
        $children[] = $this->divider();
        $children[] = $this->heading1('DETAILED INSIGHTS & ACTION PLAN', 4);

        // Topics discussed
        $topics = $detailed['topics_discussed'] ?? [];
        $topicRows = array_slice($topics, 0, 8);
        if (!empty($topicRows)) {
            $children[] = $this->heading2('Topics Discussed');
            $children[] = [
                'block_type' => 31,
                'table' => ['property' => ['row_size' => count($topicRows) + 1, 'column_size' => 3, 'column_width' => [200, 640, 120]]]
            ];
            $tableMap['topics'] = $tableIndex++;
        }

        // Action Items
        $actionItems = $detailed['action_items'] ?? [];
        if (!empty($actionItems)) {
            $children[] = $this->heading2('Action Items');
            foreach (array_slice($actionItems, 0, 8) as $idx => $item) {
                $no = $idx + 1;
                $task = $item['item'] ?? 'Task';
                $pic = $item['pic'] ?? 'Unassigned';
                $dueDate = $item['due_date'] ?? 'Not specified';
                $status = $item['status'] ?? 'Open';
                $children[] = [
                    'block_type' => 12, // Bullet
                    'bullet' => [
                        'elements' => [
                            [
                                'type' => 'text',
                                'text_run' => [
                                    'content' => "{$no}. {$task} (PIC: {$pic}, Due: {$dueDate}, Status: {$status})"
                                ]
                            ]
                        ]
                    ]
                ];
            }
        }

        // --- 5b. BUYING SIGNALS RADAR ---
        $radar = $detailed['buying_signals_radar'] ?? null;
        if ($radar && is_array($radar)) {
            $children[] = $this->heading2('Buying Signals Radar');
            $radarLabels = [
                'kebutuhan' => 'Needs',
                'urgensi' => 'Urgency',
                'budget_kesiapan' => 'Budget Readiness',
                'decision_support' => 'Decision Support',
                'solusi_fit' => 'Solution Fit',
                'niat_implementasi' => 'Implementation Intent',
            ];
            $radarLines = [];
            foreach ($radar as $key => $val) {
                $label = $radarLabels[$key] ?? ucfirst(str_replace('_', ' ', $key));
                $score = is_numeric($val) ? (int)$val : 0;
                $stars = str_repeat('★', $score) . str_repeat('☆', max(0, 5 - $score));
                $radarLines[] = "{$label}: {$stars} ({$score}/5)";
            }
            $children[] = $this->textBlock(implode("\n", $radarLines));
        }

        // --- 5c. DISCOVERY-SPECIFIC SECTIONS ---
        if ($typeKey === 'discovery' && !empty($meetingSpecific)) {
            $children[] = $this->divider();
            $children[] = $this->heading1('DISCOVERY INSIGHTS', 4);

            // Discovery Objectives
            $objectives = $meetingSpecific['discovery_objectives'] ?? [];
            if (!empty($objectives)) {
                $children[] = $this->heading2('Discovery Objectives');
                foreach (array_slice((array)$objectives, 0, 5) as $obj) {
                    $children[] = $this->bulletItem(is_array($obj) ? json_encode($obj) : $obj);
                }
            }

            // Business Challenges
            $challenges = $meetingSpecific['business_challenges'] ?? [];
            if (!empty($challenges)) {
                $children[] = $this->heading2('Business Challenges');
                foreach (array_slice((array)$challenges, 0, 5) as $ch) {
                    $children[] = $this->bulletItem(is_array($ch) ? json_encode($ch) : $ch);
                }
            }

            // Priority Use Cases (table)
            $useCases = $meetingSpecific['priority_use_cases'] ?? [];
            if (!empty($useCases) && is_array($useCases)) {
                $children[] = $this->heading2('Priority Use Cases');
                $useCaseRows = array_slice($useCases, 0, 6);
                $children[] = [
                    'block_type' => 31,
                    'table' => ['property' => ['row_size' => count($useCaseRows) + 1, 'column_size' => 3, 'column_width' => [200, 560, 200]]]
                ];
                $tableMap['use_cases'] = $tableIndex++;
            }

            // Stakeholders Identified (table)
            $stakeholders = $meetingSpecific['stakeholders_identified'] ?? [];
            if (!empty($stakeholders) && is_array($stakeholders)) {
                $children[] = $this->heading2('Stakeholders Identified');
                $stakeRows = array_slice($stakeholders, 0, 6);
                $children[] = [
                    'block_type' => 31,
                    'table' => ['property' => ['row_size' => count($stakeRows) + 1, 'column_size' => 3, 'column_width' => [240, 360, 360]]]
                ];
                $tableMap['stakeholders'] = $tableIndex++;
            }

            // Risks & Constraints
            $risks = $meetingSpecific['risks_constraints'] ?? [];
            if (!empty($risks)) {
                $children[] = $this->heading2('Risks & Constraints');
                foreach (array_slice((array)$risks, 0, 5) as $r) {
                    $children[] = $this->bulletItem(is_array($r) ? json_encode($r) : $r);
                }
            }

            // Missing Information
            $missing = $meetingSpecific['missing_information'] ?? [];
            if (!empty($missing)) {
                $children[] = $this->heading2('Missing Information');
                foreach (array_slice((array)$missing, 0, 5) as $m) {
                    $children[] = $this->bulletItem(is_array($m) ? json_encode($m) : $m);
                }
            }
        }

        // --- 6. BANTC ANALYSIS ---
        if (!empty($bantc)) {
            $children[] = $this->divider();
            $children[] = $this->heading1('BANTC ANALYSIS', 4);
            $children[] = [
                'block_type' => 31,
                'table' => ['property' => ['row_size' => 2, 'column_size' => 3, 'column_width' => [320, 320, 320]]]
            ];
            $tableMap['bantc'] = $tableIndex++;
        }

        $bantcCells = [];
        if (!empty($bantc)) {
            $bantcCells = [
                // Row 1 headers + Row 2 values
                ['title' => 'BUDGET', 'val' => $bantc['budget'] ?? '-'],
                ['title' => 'AUTHORITY', 'val' => $bantc['authority'] ?? '-'],
                ['title' => 'NEEDS', 'val' => $bantc['needs'] ?? '-'],
            ];
        }

        // BANTC Row 2: Timeline + Competitor (separate table)
        if (!empty($bantc) && (!empty($bantc['timeline']) || !empty($bantc['competitor']))) {
            $children[] = [
                'block_type' => 31,
                'table' => ['property' => ['row_size' => 2, 'column_size' => 2, 'column_width' => [480, 480]]]
            ];
            $tableMap['bantc2'] = $tableIndex++;
        }

        $bantc2Cells = [];
        if (!empty($bantc)) {
            $bantc2Cells = [
                ['title' => 'TIMELINE', 'val' => $bantc['timeline'] ?? '-'],
                ['title' => 'COMPETITOR', 'val' => $bantc['competitor'] ?? '-'],
            ];
        }

        // --- 7. CONCLUSION & NEXT STEPS ---
        $children[] = $this->divider();
        $conclusionText = $conclusion['conclusion'] ?? 'No conclusion available.';
        $children[] = [
            'block_type' => 15, // Quote
            'quote' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "CONCLUSION\n",
                            'text_element_style' => ['bold' => true, 'text_color' => 5]
                        ]
                    ],
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => $conclusionText
                        ]
                    ]
                ]
            ]
        ];

        // Next Step Summary Table — meeting-type-specific keys
        $nextStepVal = $conclusion['next_step'] ?? 'To be confirmed';
        $nextStepCells = match ($typeKey) {
            'demo' => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'TRIAL / POC POTENTIAL', 'val' => $conclusion['trial_poc_potensial'] ?? 'To be confirmed'],
                ['title' => 'DECISION TIMELINE', 'val' => $conclusion['decision_timeline'] ?? 'To be confirmed'],
            ],
            'follow_up' => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'BLOCKERS', 'val' => $conclusion['blockers'] ?? 'None identified'],
                ['title' => 'REVISED TIMELINE', 'val' => $conclusion['revised_timeline'] ?? 'To be confirmed'],
            ],
            'proposal_discussion' => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'EXPECTED REVISION', 'val' => $conclusion['expected_revision'] ?? 'To be confirmed'],
                ['title' => 'APPROVAL PATH', 'val' => $conclusion['approval_path'] ?? 'To be confirmed'],
            ],
            'closing_discussion' => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'TARGET CLOSE DATE', 'val' => $conclusion['target_close_date'] ?? 'To be confirmed'],
                ['title' => 'KEY RISK', 'val' => $conclusion['key_risk'] ?? 'To be assessed'],
            ],
            'handover_to_csm' => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'CS GOAL', 'val' => $conclusion['customer_success_goal'] ?? 'To be confirmed'],
                ['title' => 'FIRST MILESTONE', 'val' => $conclusion['first_milestone'] ?? 'To be confirmed'],
            ],
            default => [
                ['title' => 'NEXT STEP', 'val' => $nextStepVal],
                ['title' => 'EXPECTED OUTCOME', 'val' => $conclusion['expected_outcome'] ?? 'To be confirmed'],
                ['title' => 'TARGET TIMELINE', 'val' => $conclusion['target_implementation'] ?? 'To be confirmed'],
            ],
        };

        $children[] = [
            'block_type' => 31,
            'table' => ['property' => ['row_size' => 2, 'column_size' => 3, 'column_width' => [240, 560, 160]]]
        ];
        $tableMap['next_steps'] = $tableIndex++;

        // --- 8. SCORE UPDATES & PRESALES RECOMMENDATION ---
        if (!empty($scoreUpdates) || !empty($transcript->presales_recommendation)) {
            $children[] = $this->divider();
            $children[] = $this->heading2('AI Score & Recommendation');

            if (!empty($scoreUpdates)) {
                $scoreText = "Lead Score: " . ($scoreUpdates['lead_score'] ?? 'N/A')
                    . "  |  Eligibility: " . ucfirst($scoreUpdates['eligibility_status'] ?? 'N/A')
                    . "  |  Confidence: " . ($scoreUpdates['confidence'] ?? 'N/A') . "%";
                $children[] = $this->textBlock($scoreText, ['bold' => true]);
            }

            if (!empty($transcript->presales_recommendation)) {
                $children[] = $this->textBlock("Presales Recommendation: " . $transcript->presales_recommendation, ['italic' => true]);
            }
        }

        // --- 9. FOOTER SECTION ---
        $children[] = $this->divider();
        $children[] = $this->textBlock(
            "Leadsy · AI-Powered Sales & CRM\nGenerated by Leadsy AI • " . date('d F Y H:i:s'),
            ['text_color' => 7]
        );

        // Batch send document blocks creation in chunks of max 50 blocks
        $chunks = array_chunk($children, 50);
        foreach ($chunks as $chunkIdx => $chunk) {
            $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [
                'children' => $chunk,
                'index' => -1
            ]);
            // Rate limit: 3 edits/sec for a single document
            if ($chunkIdx < count($chunks) - 1) {
                usleep(400000); // 400ms delay between chunks
            }
        }

        // --- 10. POPULATE NESTED TABLES ---
        $allBlocks = $this->driveService->request('GET', "/docx/v1/documents/{$documentId}/blocks");
        $blocksList = $allBlocks['items'] ?? [];

        $tableCells = [];
        foreach ($blocksList as $b) {
            if (($b['block_type'] ?? null) === 31) {
                $tableCells[] = $b['table']['cells'] ?? $b['children'] ?? [];
            }
        }

        // Helper to populate a table cell
        $populateCell = function (string $cellBlockId, string $title, string $value, bool $isTitleBold = true) use ($documentId) {
            $elements = [];
            if (!empty($title)) {
                $elements[] = [
                    'type' => 'text',
                    'text_run' => [
                        'content' => $title . "\n",
                        'text_element_style' => ['bold' => $isTitleBold, 'text_color' => 4]
                    ]
                ];
            }
            $elements[] = [
                'type' => 'text',
                'text_run' => ['content' => $value === '' ? '-' : $value]
            ];
            $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                'children' => [['block_type' => 2, 'text' => ['elements' => $elements]]],
                'index' => -1
            ]);
            usleep(150000);
        };

        // Helper to populate a simple cell (no title, just value)
        $populateSimpleCell = function (string $cellBlockId, string $value, array $style = []) use ($documentId) {
            $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                'children' => [
                    [
                        'block_type' => 2,
                        'text' => [
                            'elements' => [
                                [
                                    'type' => 'text',
                                    'text_run' => array_filter([
                                        'content' => $value === '' ? '-' : $value,
                                        'text_element_style' => !empty($style) ? $style : null,
                                    ])
                                ]
                            ]
                        ]
                    ]
                ],
                'index' => -1
            ]);
            usleep(150000);
        };

        // Populate Table: Metadata (3×3 = 9 cells)
        $metaIdx = $tableMap['metadata'] ?? null;
        if ($metaIdx !== null && isset($tableCells[$metaIdx]) && count($tableCells[$metaIdx]) >= 9) {
            foreach ($metaCells as $idx => $cell) {
                $populateCell($tableCells[$metaIdx][$idx], $cell['title'], $cell['val']);
            }
        }

        // Populate Table: Primary Insights (2×2 = 4 cells)
        $insightsIdx = $tableMap['insights'] ?? null;
        if ($insightsIdx !== null && isset($tableCells[$insightsIdx]) && count($tableCells[$insightsIdx]) >= 4) {
            foreach ($insightCells as $idx => $cell) {
                $populateCell($tableCells[$insightsIdx][$idx], $cell['title'], $cell['content']);
            }
        }

        // Populate Table: Topics Discussed
        $topicsIdx = $tableMap['topics'] ?? null;
        if ($topicsIdx !== null && isset($tableCells[$topicsIdx]) && count($tableCells[$topicsIdx]) >= (count($topicRows) + 1) * 3) {
            $headers = ['Topic', 'Summary', 'Relevance'];
            for ($col = 0; $col < 3; $col++) {
                $populateSimpleCell($tableCells[$topicsIdx][$col], $headers[$col], ['bold' => true, 'text_color' => 4]);
            }
            foreach ($topicRows as $rowIdx => $topic) {
                $topikName = $topic['topik'] ?? $topic['topic'] ?? 'Topic';
                $ringkasan = $topic['ringkasan'] ?? $topic['summary'] ?? '';
                $relevance = $topic['relevansi'] ?? $topic['relevance'] ?? 'Not Scored';
                $rowVals = [$topikName, $ringkasan, $relevance];
                for ($col = 0; $col < 3; $col++) {
                    $populateSimpleCell($tableCells[$topicsIdx][($rowIdx + 1) * 3 + $col], $rowVals[$col]);
                }
            }
        }

        // Populate Table: Use Cases (Discovery)
        $useCasesIdx = $tableMap['use_cases'] ?? null;
        if ($useCasesIdx !== null && isset($tableCells[$useCasesIdx])) {
            $useCaseData = $meetingSpecific['priority_use_cases'] ?? [];
            $useCaseRows = array_slice($useCaseData, 0, 6);
            $ucHeaders = ['Use Case', 'Priority', 'Description'];
            for ($col = 0; $col < 3; $col++) {
                $populateSimpleCell($tableCells[$useCasesIdx][$col], $ucHeaders[$col], ['bold' => true, 'text_color' => 4]);
            }
            foreach ($useCaseRows as $rowIdx => $uc) {
                $ucVals = [
                    $uc['use_case'] ?? (is_string($uc) ? $uc : 'Use Case'),
                    $uc['priority'] ?? '-',
                    $uc['description'] ?? '-',
                ];
                for ($col = 0; $col < 3; $col++) {
                    if (isset($tableCells[$useCasesIdx][($rowIdx + 1) * 3 + $col])) {
                        $populateSimpleCell($tableCells[$useCasesIdx][($rowIdx + 1) * 3 + $col], $ucVals[$col]);
                    }
                }
            }
        }

        // Populate Table: Stakeholders (Discovery)
        $stakeholdersIdx = $tableMap['stakeholders'] ?? null;
        if ($stakeholdersIdx !== null && isset($tableCells[$stakeholdersIdx])) {
            $stakeData = $meetingSpecific['stakeholders_identified'] ?? [];
            $stakeRows = array_slice($stakeData, 0, 6);
            $shHeaders = ['Name', 'Role', 'Organization'];
            for ($col = 0; $col < 3; $col++) {
                $populateSimpleCell($tableCells[$stakeholdersIdx][$col], $shHeaders[$col], ['bold' => true, 'text_color' => 4]);
            }
            foreach ($stakeRows as $rowIdx => $sh) {
                $shVals = [
                    $sh['name'] ?? (is_string($sh) ? $sh : 'Stakeholder'),
                    $sh['role'] ?? '-',
                    $sh['organization'] ?? '-',
                ];
                for ($col = 0; $col < 3; $col++) {
                    if (isset($tableCells[$stakeholdersIdx][($rowIdx + 1) * 3 + $col])) {
                        $populateSimpleCell($tableCells[$stakeholdersIdx][($rowIdx + 1) * 3 + $col], $shVals[$col]);
                    }
                }
            }
        }

        // Populate Table: BANTC (2×3)
        $bantcIdx = $tableMap['bantc'] ?? null;
        if ($bantcIdx !== null && isset($tableCells[$bantcIdx]) && count($tableCells[$bantcIdx]) >= 6 && !empty($bantcCells)) {
            foreach ($bantcCells as $idx => $cell) {
                // Header row
                $populateSimpleCell($tableCells[$bantcIdx][$idx], $cell['title'], ['bold' => true, 'text_color' => 4]);
                // Value row
                $populateSimpleCell($tableCells[$bantcIdx][$idx + 3], $cell['val']);
            }
        }

        // Populate Table: BANTC2 (2×2) - Timeline & Competitor
        $bantc2Idx = $tableMap['bantc2'] ?? null;
        if ($bantc2Idx !== null && isset($tableCells[$bantc2Idx]) && count($tableCells[$bantc2Idx]) >= 4 && !empty($bantc2Cells)) {
            foreach ($bantc2Cells as $idx => $cell) {
                $populateSimpleCell($tableCells[$bantc2Idx][$idx], $cell['title'], ['bold' => true, 'text_color' => 4]);
                $populateSimpleCell($tableCells[$bantc2Idx][$idx + 2], $cell['val']);
            }
        }

        // Populate Table: Next Steps (2×3)
        $nextStepsIdx = $tableMap['next_steps'] ?? null;
        if ($nextStepsIdx !== null && isset($tableCells[$nextStepsIdx]) && count($tableCells[$nextStepsIdx]) >= 6) {
            foreach ($nextStepCells as $idx => $cell) {
                $populateSimpleCell($tableCells[$nextStepsIdx][$idx], $cell['title'], ['bold' => true, 'text_color' => 4]);
                $populateSimpleCell($tableCells[$nextStepsIdx][$idx + 3], $cell['val']);
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

    /**
     * Formats an array of items into a bullet list string for table cells.
     */
    private function formatList(mixed $data): string
    {
        if (empty($data)) {
            return "• Not specified";
        }
        $lines = [];
        foreach ((array)$data as $item) {
            if (is_array($item)) {
                if (isset($item['use_case'])) {
                    $lines[] = "• " . $item['use_case'] . ' (' . ($item['priority'] ?? 'Medium') . '): ' . ($item['description'] ?? '');
                } elseif (isset($item['pain_point'])) {
                    $lines[] = "• " . $item['pain_point'] . ' (' . ($item['severity'] ?? 'Medium') . '): ' . ($item['description'] ?? '');
                } elseif (isset($item['feature'])) {
                    $lines[] = "• " . $item['feature'] . ' - Reaction: ' . ($item['reaction'] ?? 'Neutral');
                } elseif (isset($item['objection'])) {
                    $lines[] = "• " . $item['objection'] . ' - Status: ' . ($item['resolution_status'] ?? 'Open');
                } elseif (isset($item['topic'])) {
                    $lines[] = "• " . $item['topic'] . ': ' . ($item['summary'] ?? '');
                } else {
                    $possibleVal = $item['val'] ?? $item['value'] ?? $item['content'] ?? $item['description'] ?? json_encode($item);
                    $lines[] = "• " . $possibleVal;
                }
            } else {
                $lines[] = "• " . $item;
            }
        }
        return implode("\n", $lines);
    }
}
