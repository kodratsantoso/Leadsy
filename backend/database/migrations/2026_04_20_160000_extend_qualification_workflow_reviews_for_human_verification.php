<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qualification_workflow_reviews', function (Blueprint $table) {
            $table->string('decision')->nullable()->after('status');
            $table->text('decision_reason')->nullable()->after('justification');
            $table->unsignedSmallInteger('original_score')->nullable()->after('decision_reason');
            $table->unsignedSmallInteger('score_override')->nullable()->after('original_score');
            $table->timestamp('decisioned_at')->nullable()->after('reviewed_at');

            $table->index(['status', 'decision'], 'qwr_status_decision_idx');
            $table->index(['lead_id', 'status'], 'qwr_lead_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('qualification_workflow_reviews', function (Blueprint $table) {
            $table->dropIndex('qwr_status_decision_idx');
            $table->dropIndex('qwr_lead_status_idx');
            $table->dropColumn([
                'decision',
                'decision_reason',
                'original_score',
                'score_override',
                'decisioned_at',
            ]);
        });
    }
};
