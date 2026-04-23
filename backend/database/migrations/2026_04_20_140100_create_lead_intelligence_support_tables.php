<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_score_breakdowns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('factor', 100);
            $table->string('value')->nullable();
            $table->decimal('weight', 5, 2)->default(0);
            $table->decimal('score_contribution', 6, 2)->default(0);
            $table->timestamps();

            $table->index(['lead_id', 'factor'], 'lead_score_breakdowns_lead_factor_idx');
            $table->index(['tenant_id', 'lead_id'], 'lead_score_breakdowns_tenant_lead_idx');
        });

        Schema::create('lead_icp_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('industry');
            $table->string('size_range')->nullable();
            $table->string('location')->nullable();
            $table->decimal('priority_weight', 5, 2)->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'industry'], 'lead_icp_config_tenant_industry_idx');
            $table->index(['tenant_id', 'location'], 'lead_icp_config_tenant_location_idx');
        });

        Schema::create('lead_analysis_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('analysis_type', 100);
            $table->json('result_json');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['lead_id', 'analysis_type'], 'lead_analysis_logs_lead_type_idx');
            $table->index(['tenant_id', 'created_at'], 'lead_analysis_logs_tenant_created_idx');
        });

        $defaultTenantId = DB::table('tenants')->orderBy('id')->value('id');

        if ($defaultTenantId) {
            DB::table('lead_score_breakdowns')->whereNull('tenant_id')->update(['tenant_id' => $defaultTenantId]);
            DB::table('lead_icp_config')->whereNull('tenant_id')->update(['tenant_id' => $defaultTenantId]);
            DB::table('lead_analysis_logs')->whereNull('tenant_id')->update(['tenant_id' => $defaultTenantId]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_analysis_logs');
        Schema::dropIfExists('lead_icp_config');
        Schema::dropIfExists('lead_score_breakdowns');
    }
};
