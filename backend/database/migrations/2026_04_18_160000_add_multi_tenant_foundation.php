<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        $tables = [
            'users',
            'leads',
            'lead_sources',
            'lead_scores',
            'lead_qualifications',
            'lead_activities',
            'audit_logs',
            'qualification_parameter_sets',
            'qualification_workflows',
            'qualification_workflow_reviews',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
                $table->index('tenant_id');
            });
        }

        $tenantId = DB::table('tenants')->insertGetId([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
            'metadata' => json_encode(['seeded_by' => 'phase_3_database_design']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($tables as $tableName) {
            DB::table($tableName)
                ->whereNull('tenant_id')
                ->update(['tenant_id' => $tenantId]);
        }
    }

    public function down(): void
    {
        $tables = [
            'qualification_workflow_reviews',
            'qualification_workflows',
            'qualification_parameter_sets',
            'audit_logs',
            'lead_activities',
            'lead_qualifications',
            'lead_scores',
            'lead_sources',
            'leads',
            'users',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('tenant_id');
            });
        }

        Schema::dropIfExists('tenants');
    }
};
