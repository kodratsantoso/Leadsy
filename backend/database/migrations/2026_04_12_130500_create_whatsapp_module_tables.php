<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old placeholder tables if they exist
        Schema::dropIfExists('whatsapp_messages');
        Schema::dropIfExists('whatsapp_conversations');
        Schema::dropIfExists('whatsapp_sessions');

        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_name')->unique();
            $table->string('status')->default('disconnected');
            $table->text('qr_payload')->nullable();
            $table->timestamp('last_qr_generated_at')->nullable();
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('disconnected_at')->nullable();
            $table->json('metadata_json')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('phone_number')->unique();
            $table->string('normalized_phone_number')->nullable()->index();
            $table->foreignId('linked_lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->boolean('is_relevant')->default(false);
            $table->string('relevance_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained('whatsapp_contacts')->cascadeOnDelete();
            $table->string('external_chat_id')->unique();
            $table->string('sync_status')->default('active');
            $table->string('relevance_status')->default('pending');
            $table->boolean('approved_for_sync')->default(false);
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->string('external_message_id')->unique();
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('message_type')->default('text');
            $table->text('body')->nullable();
            $table->string('reply_to_external_message_id')->nullable();
            $table->json('provider_payload_json')->nullable();
            $table->boolean('relevance_flag')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_sync_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_type'); // e.g. 'include_keyword', 'exclude_keyword', 'strict_allowlist'
            $table->string('rule_key')->nullable();
            $table->string('rule_value')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });

        Schema::create('whatsapp_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('campaign_name');
            $table->text('message_template');
            $table->integer('total_targets')->default(0);
            $table->string('status')->default('draft');
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_campaign_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('whatsapp_campaigns')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->string('phone_number');
            $table->string('send_status')->default('pending');
            $table->json('provider_response_json')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('whatsapp_conversations')->cascadeOnDelete();
            $table->string('provider')->nullable();
            $table->string('analysis_result'); // yes, maybe, no
            $table->float('confidence_score')->nullable();
            $table->text('reasoning_summary')->nullable();
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_ai_analyses');
        Schema::dropIfExists('whatsapp_campaign_recipients');
        Schema::dropIfExists('whatsapp_campaigns');
        Schema::dropIfExists('whatsapp_sync_rules');
        Schema::dropIfExists('whatsapp_messages');
        Schema::dropIfExists('whatsapp_conversations');
        Schema::dropIfExists('whatsapp_contacts');
        Schema::dropIfExists('whatsapp_sessions');
    }
};
