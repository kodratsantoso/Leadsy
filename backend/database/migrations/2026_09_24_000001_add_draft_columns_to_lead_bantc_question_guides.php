<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets the screening pipeline leave an AI draft for a human to review.
 *
 * The guide's whole design is that a person edits and approves before
 * anything is saved — the UI says so on the generated notice. So the draft
 * cannot be written into `questions`, which holds the approved set. These
 * columns keep a pending draft alongside it: the approved guide stays
 * untouched and visible while a newer draft waits for review.
 *
 * Additive and nullable, so existing rows are unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_bantc_question_guides', function (Blueprint $table) {
            $table->json('draft_questions')->nullable()->after('questions');
            $table->string('draft_ai_model')->nullable()->after('draft_questions');
            $table->timestamp('draft_generated_at')->nullable()->after('draft_ai_model');
        });
    }

    public function down(): void
    {
        Schema::table('lead_bantc_question_guides', function (Blueprint $table) {
            $table->dropColumn(['draft_questions', 'draft_ai_model', 'draft_generated_at']);
        });
    }
};
