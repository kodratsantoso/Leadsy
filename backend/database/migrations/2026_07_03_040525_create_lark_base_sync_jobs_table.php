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
        Schema::create('lark_base_sync_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transcript_id')->nullable()->constrained('lead_transcripts')->nullOnDelete();
            $table->foreignId('connection_id')->nullable()->constrained('lark_integrations')->nullOnDelete();
            $table->string('lark_record_id')->nullable();
            $table->string('sync_type')->default('field_update'); // field_update, attachment_update
            $table->string('status')->default('pending'); // pending, processing, success, failed, skipped
            $table->json('mapped_fields_json')->nullable();
            $table->json('payload_json')->nullable();
            $table->json('response_json')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            $table->timestamp('last_attempt_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lark_base_sync_jobs');
    }
};
