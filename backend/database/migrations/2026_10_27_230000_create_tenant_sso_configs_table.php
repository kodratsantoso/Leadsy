<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tenant_sso_configs')) {
            Schema::create('tenant_sso_configs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->string('provider', 50)->default('azure_ad'); // azure_ad, okta, google_workspace, saml_generic
                $table->string('display_name')->nullable();
                $table->string('client_id')->nullable();
                $table->text('client_secret_encrypted')->nullable();
                $table->string('issuer_url')->nullable();
                $table->string('sso_login_url')->nullable();
                $table->string('entity_id')->nullable();
                $table->json('domain_whitelist')->nullable();
                $table->json('role_mapping_rules')->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('auto_provision_users')->default(true);
                $table->timestamps();

                $table->unique(['tenant_id', 'provider']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_sso_configs');
    }
};
