<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tenantTables = [
            'products',
            'territories',
            'icp_profiles',
            'integration_configs',
            'revenue_rules',
        ];

        foreach ($tenantTables as $tableName) {
            if (! Schema::hasColumn($tableName, 'tenant_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
                    $table->index('tenant_id');
                });
            }
        }

        if (! Schema::hasTable('record_origin_mappings')) {
            Schema::create('record_origin_mappings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->string('source_system', 100);
                $table->string('source_schema', 100)->default('public');
                $table->string('source_table', 100);
                $table->string('source_record_id', 255);
                $table->string('target_table', 100);
                $table->string('target_record_id', 255);
                $table->json('metadata')->nullable();
                $table->timestamp('imported_at')->useCurrent();
                $table->timestamps();

                $table->unique(['source_system', 'source_schema', 'source_table', 'source_record_id'], 'record_origin_source_unique');
                $table->unique(['target_table', 'target_record_id'], 'record_origin_target_unique');
            });
        }

        $defaultTenantId = DB::table('tenants')->orderBy('id')->value('id');

        if ($defaultTenantId) {
            foreach ($tenantTables as $tableName) {
                if (Schema::hasColumn($tableName, 'tenant_id')) {
                    DB::table($tableName)->whereNull('tenant_id')->update(['tenant_id' => $defaultTenantId]);
                }
            }
        }

        $this->createOperationalIndexes();

        if (! $this->legacySchemaExists()) {
            return;
        }

        if ($defaultTenantId) {
            $this->backfillLegacyMappings($defaultTenantId);
        }
    }

    public function down(): void
    {
        $this->dropOperationalIndexes();

        Schema::dropIfExists('record_origin_mappings');

        $tenantTables = [
            'products',
            'territories',
            'icp_profiles',
            'integration_configs',
            'revenue_rules',
        ];

        foreach ($tenantTables as $tableName) {
            if (Schema::hasColumn($tableName, 'tenant_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('tenant_id');
                });
            }
        }

        if (Schema::hasTable('integration_configs') && $this->isPgsql()) {
            DB::statement('ALTER TABLE integration_configs ADD CONSTRAINT integration_configs_key_unique UNIQUE (key)');
        }
    }

    private function createOperationalIndexes(): void
    {
        if ($this->isSqlite()) {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS lead_contacts_one_primary_per_lead ON lead_contacts (lead_id) WHERE is_primary = 1');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_identity_unique ON lead_sources (lead_id, source_type, IFNULL(source_ref, ''))");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS integration_configs_tenant_key_unique ON integration_configs (IFNULL(tenant_id, 0), key)');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS qualification_parameter_sets_one_active_per_tenant ON qualification_parameter_sets (IFNULL(tenant_id, 0)) WHERE status = 'active' AND deleted_at IS NULL");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS qualification_workflows_active_trigger_per_tenant ON qualification_workflows (IFNULL(tenant_id, 0), trigger_status) WHERE is_active = 1 AND deleted_at IS NULL');
        } else {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS lead_contacts_one_primary_per_lead ON lead_contacts (lead_id) WHERE is_primary = true');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_identity_unique ON lead_sources (lead_id, source_type, COALESCE(source_ref, ''))");
            if ($this->isPgsql()) {
                DB::statement('ALTER TABLE integration_configs DROP CONSTRAINT IF EXISTS integration_configs_key_unique');
            }
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS integration_configs_tenant_key_unique ON integration_configs (COALESCE(tenant_id, 0), key)');
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS qualification_parameter_sets_one_active_per_tenant ON qualification_parameter_sets (COALESCE(tenant_id, 0)) WHERE status = 'active' AND deleted_at IS NULL");
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS qualification_workflows_active_trigger_per_tenant ON qualification_workflows (COALESCE(tenant_id, 0), trigger_status) WHERE is_active = true AND deleted_at IS NULL');
        }

        DB::statement('CREATE INDEX IF NOT EXISTS leads_operational_filter_idx ON leads (qualification_status, funnel_stage_id, lead_score, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS lead_scores_latest_idx ON lead_scores (lead_id, last_scored_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS lead_qualifications_latest_idx ON lead_qualifications (lead_id, last_qualified_at DESC)');
    }

    private function dropOperationalIndexes(): void
    {
        DB::statement('DROP INDEX IF EXISTS lead_contacts_one_primary_per_lead');
        DB::statement('DROP INDEX IF EXISTS lead_sources_identity_unique');
        DB::statement('DROP INDEX IF EXISTS integration_configs_tenant_key_unique');
        DB::statement('DROP INDEX IF EXISTS qualification_parameter_sets_one_active_per_tenant');
        DB::statement('DROP INDEX IF EXISTS qualification_workflows_active_trigger_per_tenant');
        DB::statement('DROP INDEX IF EXISTS leads_operational_filter_idx');
        DB::statement('DROP INDEX IF EXISTS lead_scores_latest_idx');
        DB::statement('DROP INDEX IF EXISTS lead_qualifications_latest_idx');
    }

    private function backfillLegacyMappings(int $tenantId): void
    {
        DB::statement("
            INSERT INTO record_origin_mappings (
                tenant_id, source_system, source_schema, source_table, source_record_id,
                target_table, target_record_id, metadata, imported_at, created_at, updated_at
            )
            SELECT
                {$tenantId},
                'prasetialeadsmanagement',
                'legacy_mgmt',
                'users',
                legacy_user.id,
                'users',
                app_user.id::text,
                json_build_object('matched_by', 'email'),
                now(),
                now(),
                now()
            FROM legacy_mgmt.users legacy_user
            JOIN users app_user ON app_user.email = legacy_user.email
            ON CONFLICT (target_table, target_record_id) DO NOTHING
        ");

        DB::statement("
            INSERT INTO record_origin_mappings (
                tenant_id, source_system, source_schema, source_table, source_record_id,
                target_table, target_record_id, metadata, imported_at, created_at, updated_at
            )
            SELECT
                {$tenantId},
                'prasetialeadsmanagement',
                'legacy_mgmt',
                'products',
                legacy_product.id,
                'products',
                app_product.id::text,
                json_build_object('matched_by', 'name'),
                now(),
                now(),
                now()
            FROM legacy_mgmt.products legacy_product
            JOIN products app_product ON app_product.name = legacy_product.name
            ON CONFLICT (target_table, target_record_id) DO NOTHING
        ");

        DB::statement("
            INSERT INTO record_origin_mappings (
                tenant_id, source_system, source_schema, source_table, source_record_id,
                target_table, target_record_id, metadata, imported_at, created_at, updated_at
            )
            SELECT
                {$tenantId},
                'prasetialeadsmanagement',
                'legacy_mgmt',
                'leads',
                legacy_lead.id,
                'leads',
                app_lead.id::text,
                json_build_object('matched_by', 'company_name_email'),
                now(),
                now(),
                now()
            FROM legacy_mgmt.leads legacy_lead
            JOIN leads app_lead
              ON app_lead.company_name = legacy_lead.company_name
             AND COALESCE(app_lead.email, '') = COALESCE(legacy_lead.contact_email, '')
            ON CONFLICT (target_table, target_record_id) DO NOTHING
        ");
    }

    private function legacySchemaExists(): bool
    {
        if (! $this->isPgsql()) {
            return false;
        }

        return DB::table('pg_tables')
            ->where('schemaname', 'legacy_mgmt')
            ->where('tablename', 'leads')
            ->exists();
    }

    private function isPgsql(): bool
    {
        return DB::getDriverName() === 'pgsql';
    }

    private function isSqlite(): bool
    {
        return DB::getDriverName() === 'sqlite';
    }
};
