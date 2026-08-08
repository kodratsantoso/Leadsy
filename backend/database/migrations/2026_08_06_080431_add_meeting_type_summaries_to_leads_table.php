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
        Schema::table('leads', function (Blueprint $table) {
            $table->jsonb('general_meeting_summary')->nullable();
            $table->unsignedBigInteger('general_meeting_attachment_id')->nullable();
            $table->jsonb('discovery_meeting_summary')->nullable();
            $table->unsignedBigInteger('discovery_meeting_attachment_id')->nullable();
            $table->jsonb('demo_meeting_summary')->nullable();
            $table->unsignedBigInteger('demo_meeting_attachment_id')->nullable();
            $table->jsonb('follow_up_meeting_summary')->nullable();
            $table->unsignedBigInteger('follow_up_meeting_attachment_id')->nullable();
            $table->jsonb('proposal_discussion_summary')->nullable();
            $table->unsignedBigInteger('proposal_discussion_attachment_id')->nullable();
            $table->jsonb('closing_discussion_summary')->nullable();
            $table->unsignedBigInteger('closing_discussion_attachment_id')->nullable();
            $table->jsonb('handover_to_csm_summary')->nullable();
            $table->unsignedBigInteger('handover_to_csm_attachment_id')->nullable();
            
            $table->foreign('general_meeting_attachment_id', 'fk_leads_general_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('discovery_meeting_attachment_id', 'fk_leads_discovery_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('demo_meeting_attachment_id', 'fk_leads_demo_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('follow_up_meeting_attachment_id', 'fk_leads_follow_up_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('proposal_discussion_attachment_id', 'fk_leads_proposal_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('closing_discussion_attachment_id', 'fk_leads_closing_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
            $table->foreign('handover_to_csm_attachment_id', 'fk_leads_handover_attach')->references('id')->on('meeting_summary_documents')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            //
        });
    }
};
