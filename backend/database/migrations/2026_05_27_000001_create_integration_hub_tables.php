<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('provider', 80);
            $table->string('provider_account_id')->nullable();
            $table->string('provider_account_name')->nullable();
            $table->string('display_name');
            $table->string('auth_type', 40)->default('oauth2');
            $table->string('status', 40)->default('disconnected');
            $table->boolean('is_enabled')->default(false);
            $table->json('scopes')->default('[]');
            $table->json('config')->default('{}');
            $table->json('metadata')->default('{}');
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('disconnected_at')->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->string('last_error_code')->nullable();
            $table->text('last_error_message')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'provider', 'status'], 'integration_connections_status_idx');
            $table->index(['tenant_id', 'is_enabled'], 'integration_connections_enabled_idx');
            $table->unique(['tenant_id', 'provider', 'provider_account_id'], 'integration_connections_provider_account_unique');
        });

        Schema::create('integration_credential_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('integration_connection_id')->constrained('integration_connections')->cascadeOnDelete();
            $table->string('credential_type', 60);
            $table->string('key_name', 100);
            $table->text('encrypted_value');
            $table->string('encryption_key_id', 100);
            $table->char('value_fingerprint', 64)->nullable();
            $table->string('last4', 8)->nullable();
            $table->json('metadata')->default('{}');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('rotated_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'credential_type'], 'integration_credentials_type_idx');
            $table->index(['integration_connection_id', 'key_name'], 'integration_credentials_key_idx');
            $table->index(['expires_at', 'revoked_at'], 'integration_credentials_rotation_idx');
            $table->index('value_fingerprint', 'integration_credentials_fingerprint_idx');
        });

        Schema::create('integration_entity_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('integration_connection_id')->constrained('integration_connections')->cascadeOnDelete();
            $table->string('provider', 80);
            $table->string('external_entity_type', 80);
            $table->string('external_entity_id');
            $table->string('leadsy_entity_type', 80);
            $table->unsignedBigInteger('leadsy_entity_id');
            $table->json('metadata')->default('{}');
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['integration_connection_id', 'external_entity_type', 'external_entity_id'], 'integration_entity_external_unique');
            $table->unique(['integration_connection_id', 'leadsy_entity_type', 'leadsy_entity_id'], 'integration_entity_leadsy_unique');
            $table->index(['tenant_id', 'leadsy_entity_type', 'leadsy_entity_id'], 'integration_entity_leadsy_idx');
        });

        Schema::create('integration_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('integration_connection_id')->nullable()->constrained('integration_connections')->nullOnDelete();
            $table->string('provider', 80);
            $table->string('event_type', 120)->nullable();
            $table->string('external_event_id')->nullable();
            $table->char('idempotency_key', 64)->unique();
            $table->char('payload_hash', 64);
            $table->json('payload');
            $table->json('headers')->nullable();
            $table->string('status', 40)->default('received');
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('processing_error')->nullable();
            $table->timestamp('received_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['provider', 'status', 'received_at'], 'integration_webhooks_status_idx');
            $table->index(['tenant_id', 'provider'], 'integration_webhooks_tenant_provider_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_webhook_events');
        Schema::dropIfExists('integration_entity_mappings');
        Schema::dropIfExists('integration_credential_stores');
        Schema::dropIfExists('integration_connections');
    }
};
