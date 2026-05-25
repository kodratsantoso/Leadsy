<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Main Lark integration configuration
        Schema::create('lark_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('app_id')->unique();
            $table->text('app_secret_encrypted')->nullable(); // Stored encrypted
            $table->text('verification_token_encrypted')->nullable();
            $table->text('encrypt_key_encrypted')->nullable();
            $table->string('base_url')->nullable(); // For Lark Base integration
            $table->json('features')->default('{}'); // { "messenger": true, "meeting": true, ... }
            $table->json('enabled_modules')->default('{}'); // Track which modules are enabled
            $table->boolean('is_active')->default(false);
            $table->timestamp('last_sync_at')->nullable();
            $table->text('sync_status')->nullable(); // Status of last sync
            $table->timestamps();
            $table->softDeletes();
        });

        // Lark sync history / audit trail
        Schema::create('lark_syncs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lark_integration_id')->constrained('lark_integrations')->cascadeOnDelete();
            $table->string('module'); // 'messenger', 'meeting', 'calendar', 'task', 'base', 'sso'
            $table->string('action'); // 'create', 'update', 'delete', 'sync', 'test'
            $table->string('lark_entity_type')->nullable(); // Type of entity (message, meeting, calendar_event, etc)
            $table->string('lark_entity_id')->nullable(); // ID of entity in Lark
            $table->string('leadsy_entity_type')->nullable(); // Type of entity in Leadsy
            $table->string('leadsy_entity_id')->nullable(); // ID of entity in Leadsy
            $table->string('status')->default('pending'); // 'pending', 'success', 'failed'
            $table->text('request_data')->nullable();
            $table->text('response_data')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamps();
        });

        // Lark event log (webhook events received from Lark)
        Schema::create('lark_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lark_integration_id')->constrained('lark_integrations')->cascadeOnDelete();
            $table->string('event_type'); // Type of event from Lark
            $table->string('lark_entity_type')->nullable(); // Entity type (message, meeting, etc)
            $table->string('lark_entity_id')->nullable(); // ID of entity
            $table->json('event_data')->nullable(); // Full event payload from Lark
            $table->string('status')->default('received'); // 'received', 'processed', 'failed'
            $table->text('processing_error')->nullable();
            $table->timestamps();
        });

        // Lark SSO user mapping
        Schema::create('lark_sso_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('lark_user_id')->unique(); // Lark UUID
            $table->string('lark_union_id')->nullable(); // Lark union_id for organization
            $table->string('lark_email')->nullable();
            $table->string('lark_name')->nullable();
            $table->string('lark_mobile')->nullable();
            $table->string('lark_avatar_url')->nullable();
            $table->string('lark_department_id')->nullable();
            $table->string('lark_direct_manager_id')->nullable(); // For hierarchy mapping
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lark_sso_users');
        Schema::dropIfExists('lark_events');
        Schema::dropIfExists('lark_syncs');
        Schema::dropIfExists('lark_integrations');
    }
};
