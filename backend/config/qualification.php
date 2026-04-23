<?php

return [
    'version' => 'enterprise-qualification-v1',

    'thresholds' => [
        'eligible' => 80,
        'potential' => 60,
        'need_review_floor' => 40,
        'missing_critical_fields_for_review' => 3,
    ],

    'critical_fields' => [
        'target_industry_fit',
        'problem_statement',
        'budget_status',
        'decision_maker_engaged',
        'technical_fit',
    ],

    'dimensions' => [
        'firmographic' => [
            'weight' => 25,
            'industry_fit' => ['high' => 15, 'medium' => 9, 'unknown' => 4, 'low' => 0],
            'company_size_band' => ['enterprise' => 6, 'medium' => 6, 'small' => 5, 'micro' => 2, 'unknown' => 2],
            'territory_fit' => ['yes' => 4, 'unknown' => 2, 'no' => 0],
        ],
        'need_relevance' => [
            'weight' => 25,
            'problem_statement' => ['present' => 8, 'absent' => 0],
            'pain_level' => ['high' => 10, 'medium' => 6, 'low' => 2, 'unknown' => 0],
            'use_case_fit' => ['high' => 7, 'medium' => 4, 'unknown' => 2, 'low' => 0],
        ],
        'commercial_readiness' => [
            'weight' => 20,
            'budget_status' => ['confirmed' => 10, 'range' => 6, 'unknown' => 2, 'unavailable' => 0],
            'timeline_months' => ['fast' => 6, 'planned' => 4, 'long' => 2, 'unknown' => 1, 'deferred' => 0],
            'commercial_urgency' => ['high' => 4, 'medium' => 2, 'low' => 1, 'unknown' => 0],
        ],
        'stakeholder_access' => [
            'weight' => 15,
            'decision_maker_engaged' => ['yes' => 8, 'unknown' => 2, 'no' => 0],
            'stakeholder_count' => ['multi' => 4, 'single' => 2, 'none' => 0],
            'contact_quality' => ['strong' => 3, 'weak' => 1, 'absent' => 0],
        ],
        'technical_fit' => [
            'weight' => 15,
            'technical_fit' => ['high' => 9, 'medium' => 5, 'unknown' => 2, 'low' => 0],
            'integration_complexity' => ['low' => 4, 'medium' => 2, 'unknown' => 1, 'high' => 0],
            'capabilities_defined' => ['yes' => 2, 'no' => 0],
        ],
    ],

    'hard_stops' => [
        [
            'field' => 'territory_fit',
            'operator' => 'equals',
            'value' => false,
            'message' => 'Outside approved territory coverage.',
        ],
        [
            'field' => 'target_industry_fit',
            'operator' => 'equals',
            'value' => 'low',
            'message' => 'Explicitly outside the target industry profile.',
        ],
        [
            'field' => 'budget_status',
            'operator' => 'equals',
            'value' => 'unavailable',
            'message' => 'No viable budget path has been identified.',
        ],
        [
            'field' => 'technical_fit',
            'operator' => 'equals',
            'value' => 'low',
            'message' => 'Technical fit is incompatible with current offering.',
        ],
    ],

    'recommendations' => [
        'eligible' => 'Advance to CRM and active sales workflow.',
        'potential' => 'Enrich commercial and stakeholder evidence before handoff.',
        'need_review' => 'Route to a reviewer to close critical data gaps before progression.',
        'not_eligible' => 'Do not push downstream. Log the disqualification rationale and revisit only with materially new evidence.',
    ],
];
