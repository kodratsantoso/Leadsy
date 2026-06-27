<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$tablesToCheck = [
    'leads',
    'funnel_stages',
    'industries',
    'business_categories',
    'lead_outcomes',
    'lead_activities',
    'lead_notes',
    'lead_meetings',
    'lead_meeting_transcripts', // if exists
    'lead_pre_meeting_briefs',
    'lead_bantc_question_guides',
    'lead_product_matches',
    'lead_sales_orders',
    'lead_quotations',
    'users',
    'roles',
    'lead_role_assignments',
    'ai_attention_highlights',
    'ai_generated_outputs',
    'confidentiality_assessments', // checking if already exists
];

$results = [];

foreach ($tablesToCheck as $table) {
    if (Schema::hasTable($table)) {
        $count = DB::table($table)->count();
        $columns = Schema::getColumnListing($table);
        $results[$table] = [
            'status' => 'exists',
            'count' => $count,
            'columns' => array_slice($columns, 0, 15) // just getting a sample of columns
        ];
    } else {
        $results[$table] = ['status' => 'missing'];
    }
}

echo json_encode($results, JSON_PRETTY_PRINT);
