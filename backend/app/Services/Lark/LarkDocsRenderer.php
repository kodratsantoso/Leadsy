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
            $existingBlocks = $this->driveService->request('GET', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children");
            $childrenList = $existingBlocks['data']['items'] ?? [];
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

        $children = [];

        // --- 1. HEADER SECTION ---
        $children[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "MEETING SUMMARY - " . strtoupper($meetingType),
                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                        ]
                    ]
                ]
            ]
        ];
        $children[] = [
            'block_type' => 2, // Text paragraph
            'text' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "AI-Powered Summary by Leadsy",
                            'text_element_style' => ['italic' => true]
                        ]
                    ]
                ]
            ]
        ];
        $children[] = ['block_type' => 22, 'divider' => (object)[]];

        // --- 2. METADATA SECTION (TABLE) ---
        $dateStr = $transcript->recorded_at ? $transcript->recorded_at->format('d F Y') : '-';
        $ownerName = $lead->owner ? $lead->owner->name : 'Unassigned';
        $children[] = [
            'block_type' => 31, // Table
            'table' => [
                'property' => [
                    'row_size' => 2,
                    'column_size' => 3
                ]
            ]
        ];

        // Metadata cells content
        $metaCells = [
            ['title' => 'Meeting Type', 'val' => $meetingType],
            ['title' => 'Product', 'val' => $lead->product ? $lead->product->name : 'LarkSuite'],
            ['title' => 'Company', 'val' => $lead->company_name ?: 'Unknown Company'],
            ['title' => 'Date & Time', 'val' => $dateStr],
            ['title' => 'Owner', 'val' => $ownerName],
            ['title' => 'Lead Score', 'val' => $lead->lead_score ? (string)$lead->lead_score : 'N/A']
        ];

        // --- 3. EXECUTIVE SUMMARY ---
        $execSummaryText = $general['executive_summary'] ?? 'No summary available.';
        $children[] = [
            'block_type' => 17, // Quote
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
        $children[] = ['block_type' => 22, 'divider' => (object)[]];

        // --- 4. PRIMARY INSIGHTS CARDS (TABLE) ---
        // Dynamically select cards depending on meeting type
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

        $children[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => 'PRIMARY INSIGHTS',
                            'text_element_style' => ['bold' => true]
                        ]
                    ]
                ]
            ]
        ];

        // Format bullet lists for primary insights
        $formatList = function($data) {
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
                        // Fallback value mapping keys
                        $possibleVal = $item['val'] ?? $item['value'] ?? $item['content'] ?? $item['description'] ?? json_encode($item);
                        $lines[] = "• " . $possibleVal;
                    }
                } else {
                    $lines[] = "• " . $item;
                }
            }
            return implode("\n", $lines);
        };

        $children[] = [
            'block_type' => 31, // Table
            'table' => [
                'property' => [
                    'row_size' => 2,
                    'column_size' => 2
                ]
            ]
        ];

        $insightCells = [
            ['title' => $card1Title, 'content' => $formatList($card1Data)],
            ['title' => $card2Title, 'content' => $formatList($card2Data)],
            ['title' => $card3Title, 'content' => $formatList($card3Data)],
            ['title' => $card4Title, 'content' => $formatList($card4Data)]
        ];

        // --- 5. DETAILED INSIGHTS & ACTION PLAN ---
        $children[] = ['block_type' => 22, 'divider' => (object)[]];
        $children[] = [
            'block_type' => 3, // Heading 1
            'heading1' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => 'DETAILED INSIGHTS & ACTION PLAN',
                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                        ]
                    ]
                ]
            ]
        ];

        // Topics discussed
        $topics = $detailed['topics_discussed'] ?? [];
        $topicRows = array_slice($topics, 0, 8);
        if (!empty($topicRows)) {
            $children[] = [
                'block_type' => 4, // Heading 2
                'heading2' => [
                    'elements' => [
                        [
                            'type' => 'text',
                            'text_run' => [
                                'content' => 'Topics Discussed',
                                'text_element_style' => ['bold' => true]
                            ]
                        ]
                    ]
                ]
            ];

            $children[] = [
                'block_type' => 31, // Table
                'table' => [
                    'property' => [
                        'row_size' => count($topicRows) + 1,
                        'column_size' => 3
                    ]
                ]
            ];
        }

        // Action Items Table
        $actionItems = $detailed['action_items'] ?? [];
        if (!empty($actionItems)) {
            $children[] = [
                'block_type' => 4, // Heading 2
                'heading2' => [
                    'elements' => [
                        [
                            'type' => 'text',
                            'text_run' => [
                                'content' => 'Action Items',
                                'text_element_style' => ['bold' => true]
                            ]
                        ]
                    ]
                ]
            ];
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

        // --- 6. CONCLUSION & NEXT STEPS ---
        $children[] = ['block_type' => 22, 'divider' => (object)[]];
        $conclusionText = $conclusion['conclusion'] ?? 'No conclusion available.';
        $children[] = [
            'block_type' => 19, // Callout
            'callout' => [
                'emoji_id' => 'bulb',
                'background_color' => 1, // Light Red / Neutral Light
                'border_color' => 1,
                'text_color' => 1
            ]
        ];

        // Next Step Summary Table (2 Rows x 3 Columns)
        $nextStepVal = $conclusion['next_step'] ?? 'To be confirmed';
        $children[] = [
            'block_type' => 31, // Table
            'table' => [
                'property' => [
                    'row_size' => 2,
                    'column_size' => 3
                ]
            ]
        ];

        $nextStepCells = [
            ['title' => 'NEXT STEP', 'val' => $nextStepVal],
            ['title' => 'EXPECTED OUTCOME', 'val' => $conclusion['expected_outcome'] ?? 'To be confirmed'],
            ['title' => 'TARGET TIMELINE', 'val' => $conclusion['target_implementation'] ?? 'To be confirmed']
        ];

        // --- 7. FOOTER SECTION ---
        $children[] = ['block_type' => 22, 'divider' => (object)[]];
        $children[] = [
            'block_type' => 2, // Text paragraph
            'text' => [
                'elements' => [
                    [
                        'type' => 'text',
                        'text_run' => [
                            'content' => "Leadsy · AI-Powered Sales & CRM\nGenerated by Leadsy AI • " . date('d F Y H:i:s'),
                            'text_element_style' => ['text_color' => 7] // Gray text color
                        ]
                    ]
                ]
            ]
        ];

        // Batch send document blocks creation in chunks of max 50 blocks
        $chunks = array_chunk($children, 50);
        foreach ($chunks as $chunk) {
            $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$rootBlockId}/children", [
                'children' => $chunk,
                'index' => -1
            ]);
        }

        // --- 8. POPULATE NESTED TABLES ---
        // Fetch all blocks to retrieve cell block IDs of created tables
        $allBlocks = $this->driveService->request('GET', "/docx/v1/documents/{$documentId}/blocks");
        $blocksList = $allBlocks['data']['blocks'] ?? [];

        // Match table blocks and update their cell contents
        $tableCells = [];
        foreach ($blocksList as $b) {
            if (($b['block_type'] ?? null) === 31) { // Table
                $tableCells[] = $b['table']['cells'] ?? $b['children'] ?? [];
            }
        }

        // Populate Table 1: Metadata table
        if (isset($tableCells[0]) && count($tableCells[0]) >= 6) {
            foreach ($metaCells as $idx => $cell) {
                $cellBlockId = $tableCells[0][$idx];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => "{$cell['title']}\n",
                                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                                        ]
                                    ],
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $cell['val']
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'index' => -1
                ]);
            }
        }

        // Populate Table 2: Primary Insights
        if (isset($tableCells[1]) && count($tableCells[1]) >= 4) {
            foreach ($insightCells as $idx => $cell) {
                $cellBlockId = $tableCells[1][$idx];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => "{$cell['title']}\n",
                                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                                        ]
                                    ],
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $cell['content']
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'index' => -1
                ]);
            }
        }

        // Populate Table 3: Topics Discussed Table
        if (isset($tableCells[2]) && count($tableCells[2]) >= (count($topicRows) + 1) * 3) {
            $headers = ['Topic', 'Summary', 'Relevance'];
            // Headers
            for ($col = 0; $col < 3; $col++) {
                $cellBlockId = $tableCells[2][$col];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $headers[$col],
                                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'index' => -1
                ]);
            }
            // Rows
            foreach ($topicRows as $rowIdx => $topic) {
                $topikName = $topic['topik'] ?? $topic['topic'] ?? 'Topic';
                $ringkasan = $topic['ringkasan'] ?? $topic['summary'] ?? '';
                $relevance = $topic['relevansi'] ?? $topic['relevance'] ?? 'Not Scored';

                $rowVals = [$topikName, $ringkasan, $relevance];
                for ($col = 0; $col < 3; $col++) {
                    $cellBlockId = $tableCells[2][($rowIdx + 1) * 3 + $col];
                    $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$cellBlockId}/children", [
                        'children' => [
                            [
                                'block_type' => 2,
                                'text' => [
                                    'elements' => [
                                        [
                                            'type' => 'text',
                                            'text_run' => [
                                                'content' => $rowVals[$col]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        'index' => -1
                    ]);
                }
            }
        }

        // Populate Table 4: Next Steps (2 Rows x 3 Columns)
        $nextStepTableIdx = 3;
        if (isset($tableCells[$nextStepTableIdx]) && count($tableCells[$nextStepTableIdx]) >= 6) {
            foreach ($nextStepCells as $idx => $cell) {
                // Header row cells (0, 1, 2)
                $headerCellId = $tableCells[$nextStepTableIdx][$idx];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$headerCellId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $cell['title'],
                                            'text_element_style' => ['bold' => true, 'text_color' => 4]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'index' => -1
                ]);

                // Value row cells (3, 4, 5)
                $valueCellId = $tableCells[$nextStepTableIdx][$idx + 3];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$valueCellId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
                                'elements' => [
                                    [
                                        'type' => 'text',
                                        'text_run' => [
                                            'content' => $cell['val']
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'index' => -1
                ]);
            }
        }

        // Populate Callout block: Conclusion
        foreach ($blocksList as $b) {
            if (($b['block_type'] ?? null) === 19) { // Callout
                $calloutBlockId = $b['block_id'];
                $this->driveService->request('POST', "/docx/v1/documents/{$documentId}/blocks/{$calloutBlockId}/children", [
                    'children' => [
                        [
                            'block_type' => 2,
                            'text' => [
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
                        ]
                    ],
                    'index' => -1
                ]);
                break;
            }
        }
    }
}
