<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('lark_base_tables')) {
            Schema::create('lark_base_tables', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('lark_integration_id')->constrained('lark_integrations')->cascadeOnDelete();
                $table->string('app_token');
                $table->string('table_id');
                $table->string('table_name')->nullable();
                $table->string('leadsy_entity_type')->default('lead');
                $table->string('sync_direction')->default('two_way');
                $table->json('field_mapping')->default('{}');
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_pull_at')->nullable();
                $table->timestamp('last_push_at')->nullable();
                $table->timestamps();

                $table->unique(['tenant_id', 'app_token', 'table_id'], 'lark_base_tables_unique_table');
                $table->index(['tenant_id', 'leadsy_entity_type', 'is_active'], 'lark_base_tables_entity_idx');
            });
        }

        if (! Schema::hasTable('lark_base_record_mappings')) {
            Schema::create('lark_base_record_mappings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('lark_base_table_id')->constrained('lark_base_tables')->cascadeOnDelete();
                $table->string('leadsy_entity_type')->default('lead');
                $table->string('leadsy_entity_id');
                $table->string('lark_record_id');
                $table->timestamp('last_lark_updated_at')->nullable();
                $table->timestamp('last_leadsy_updated_at')->nullable();
                $table->string('last_sync_source')->nullable();
                $table->timestamps();

                $table->unique(['lark_base_table_id', 'lark_record_id'], 'lark_base_record_unique_lark');
                $table->unique(['lark_base_table_id', 'leadsy_entity_type', 'leadsy_entity_id'], 'lark_base_record_unique_leadsy');
                $table->index(['tenant_id', 'leadsy_entity_type', 'leadsy_entity_id'], 'lark_base_record_leadsy_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lark_base_record_mappings');
        Schema::dropIfExists('lark_base_tables');
    }
};
