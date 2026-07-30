<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ps_project_tasks', function (Blueprint $table) {
            $table->integer('progress_percentage')->default(0);
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->text('completion_notes')->nullable();
            $table->text('blocker_reason')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('completed_at')->nullable();
        });

        Schema::table('ps_project_delivery_checklists', function (Blueprint $table) {
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->integer('issues_count')->default(0);
            $table->boolean('sign_off_status')->default(false);
            $table->foreignId('sign_off_document_id')->nullable()->constrained('ps_documents')->onDelete('set null');
            $table->string('customer_pic')->nullable();
        });

        Schema::table('ps_project_risks', function (Blueprint $table) {
            $table->integer('probability')->nullable();
            $table->integer('impact')->nullable();
            $table->date('due_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ps_project_risks', function (Blueprint $table) {
            $table->dropColumn(['probability', 'impact', 'due_date']);
        });

        Schema::table('ps_project_delivery_checklists', function (Blueprint $table) {
            $table->dropForeign(['sign_off_document_id']);
            $table->dropColumn(['actual_start_date', 'actual_end_date', 'issues_count', 'sign_off_status', 'sign_off_document_id', 'customer_pic']);
        });

        Schema::table('ps_project_tasks', function (Blueprint $table) {
            $table->dropForeign(['completed_by']);
            $table->dropColumn(['progress_percentage', 'actual_start_date', 'actual_end_date', 'completion_notes', 'blocker_reason', 'completed_by', 'completed_at']);
        });
    }
};
