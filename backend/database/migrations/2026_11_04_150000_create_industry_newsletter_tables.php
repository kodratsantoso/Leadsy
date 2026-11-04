<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('industry_news_sync_logs')) {
            Schema::create('industry_news_sync_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('industry_id')->constrained('industries')->cascadeOnDelete();
                $table->foreignId('sub_industry_id')->nullable()->constrained('sub_industries')->nullOnDelete();
                $table->string('region_scope', 16)->default('id');
                $table->string('status', 32)->default('queued');
                $table->unsignedInteger('articles_fetched')->default(0);
                $table->unsignedInteger('new_articles_saved')->default(0);
                $table->unsignedInteger('entities_detected')->default(0);
                $table->json('providers_used')->nullable();
                $table->text('error_message')->nullable();
                $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'industry_id', 'created_at'], 'ind_news_sync_tenant_ind_created_idx');
            });
        }

        if (! Schema::hasTable('industry_news_articles')) {
            Schema::create('industry_news_articles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('industry_id')->constrained('industries')->cascadeOnDelete();
                $table->foreignId('sub_industry_id')->nullable()->constrained('sub_industries')->nullOnDelete();
                $table->string('region_scope', 16)->default('id');
                $table->string('url_hash', 64);
                $table->text('title');
                $table->text('url');
                $table->string('source_name', 191)->nullable();
                $table->string('source_domain', 191)->nullable();
                $table->timestamp('published_at')->nullable();
                $table->text('snippet')->nullable();
                $table->string('signal_type', 50)->default('market_move');
                $table->string('relevance_tier', 20)->default('medium');
                $table->string('search_provider', 50)->default('google_news_rss');
                $table->timestamps();

                $table->unique(['tenant_id', 'industry_id', 'url_hash'], 'ind_news_tenant_ind_url_uniq');
                $table->index(['tenant_id', 'industry_id', 'published_at'], 'ind_news_tenant_ind_pub_idx');
                $table->index(['tenant_id', 'industry_id', 'signal_type'], 'ind_news_tenant_ind_sig_idx');
            });
        }

        if (! Schema::hasTable('industry_news_entities')) {
            Schema::create('industry_news_entities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->foreignId('article_id')->constrained('industry_news_articles')->cascadeOnDelete();
                $table->foreignId('industry_id')->constrained('industries')->cascadeOnDelete();
                $table->string('entity_name', 255);
                $table->string('normalized_name', 255);
                $table->string('entity_type', 32)->default('company');
                $table->string('parent_company_hint', 255)->nullable();
                $table->string('website_hint', 255)->nullable();
                $table->string('role_in_news', 32)->default('subject');
                $table->text('signal_context')->nullable();
                $table->foreignId('matched_lead_id')->nullable()->constrained('leads')->nullOnDelete();
                $table->timestamp('converted_at')->nullable();
                $table->timestamps();

                $table->unique(['article_id', 'normalized_name'], 'ind_news_entity_article_norm_uniq');
                $table->index(['tenant_id', 'industry_id', 'normalized_name'], 'ind_news_ent_tenant_ind_norm_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('industry_news_entities');
        Schema::dropIfExists('industry_news_articles');
        Schema::dropIfExists('industry_news_sync_logs');
    }
};
