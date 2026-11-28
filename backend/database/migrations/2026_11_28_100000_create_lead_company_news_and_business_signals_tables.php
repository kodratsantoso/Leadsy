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
        if (!Schema::hasTable('lead_company_news')) {
            Schema::create('lead_company_news', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->string('headline');
                $table->text('canonical_url');
                $table->string('publisher_name')->nullable();
                $table->string('publisher_domain')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->text('summary')->nullable();
                $table->string('source_provider')->default('google_news');
                $table->unsignedSmallInteger('relevance_score')->default(70);
                $table->unsignedSmallInteger('reliability_score')->default(80);
                $table->string('verification_status')->default('verified');
                $table->boolean('is_relevant')->default(true);
                $table->boolean('is_excluded')->default(false);
                $table->jsonb('raw_metadata')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'published_at']);
                $table->index(['lead_id', 'is_relevant']);
                $table->index(['tenant_id', 'lead_id']);
            });
        }

        if (!Schema::hasTable('lead_business_signals')) {
            Schema::create('lead_business_signals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('news_id')->nullable()->constrained('lead_company_news')->nullOnDelete();
                $table->string('signal_type')->default('opportunity'); // opportunity, risk, expansion, m_and_a, leadership, financial, product_launch, regulatory
                $table->string('sentiment')->default('neutral'); // positive, negative, neutral
                $table->string('impact_level')->default('medium'); // high, medium, low
                $table->string('title');
                $table->text('description')->nullable();
                $table->text('actionable_recommendation')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'signal_type']);
                $table->index(['lead_id', 'impact_level']);
                $table->index(['tenant_id', 'lead_id']);
            });
        }

        if (!Schema::hasTable('lead_news_intelligence_analyses')) {
            Schema::create('lead_news_intelligence_analyses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->text('business_summary')->nullable();
                $table->text('business_outlook')->nullable();
                $table->jsonb('opportunity_signals')->nullable();
                $table->jsonb('risk_signals')->nullable();
                $table->jsonb('product_recommendations')->nullable();
                $table->jsonb('pitching_recommendations')->nullable();
                $table->jsonb('bantc_hypotheses')->nullable();
                $table->jsonb('discovery_questions')->nullable();
                $table->unsignedSmallInteger('confidence')->default(85);
                $table->jsonb('raw_ai_response')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'created_at']);
                $table->index(['tenant_id', 'lead_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_news_intelligence_analyses');
        Schema::dropIfExists('lead_business_signals');
        Schema::dropIfExists('lead_company_news');
    }
};
