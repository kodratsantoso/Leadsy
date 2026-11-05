<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Upgrade industries for multi-tenant isolation while preserving global defaults (tenant_id = null)
        if (Schema::hasTable('industries')) {
            Schema::table('industries', function (Blueprint $table) {
                if (! Schema::hasColumn('industries', 'tenant_id')) {
                    $table->foreignId('tenant_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('tenants')
                        ->nullOnDelete();
                }
            });

            try {
                Schema::table('industries', function (Blueprint $table) {
                    $table->dropUnique('industries_name_unique');
                });
            } catch (\Throwable) {
                // Already dropped or named differently on custom test schema
            }

            Schema::table('industries', function (Blueprint $table) {
                $table->unique(['tenant_id', 'name'], 'industries_tenant_name_unique');
                $table->index(['tenant_id', 'is_active'], 'industries_tenant_active_idx');
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS industries_tenant_coalesce_lower_name_uniq ON industries ((COALESCE(tenant_id, 0)), LOWER(name))');
            }
        }

        // 2. Upgrade sub_industries with optional tenant_id
        if (Schema::hasTable('sub_industries')) {
            Schema::table('sub_industries', function (Blueprint $table) {
                if (! Schema::hasColumn('sub_industries', 'tenant_id')) {
                    $table->foreignId('tenant_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('tenants')
                        ->nullOnDelete();
                    $table->index(['tenant_id', 'industry_id', 'is_active'], 'sub_industries_tenant_ind_active_idx');
                }
            });
        }

        // 3. Upgrade business_categories with tenant_id, parent industry_id, channel_role, and description
        if (Schema::hasTable('business_categories')) {
            Schema::table('business_categories', function (Blueprint $table) {
                if (! Schema::hasColumn('business_categories', 'tenant_id')) {
                    $table->foreignId('tenant_id')
                        ->nullable()
                        ->after('id')
                        ->constrained('tenants')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('business_categories', 'industry_id')) {
                    $table->foreignId('industry_id')
                        ->nullable()
                        ->after('tenant_id')
                        ->constrained('industries')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('business_categories', 'channel_role')) {
                    $table->string('channel_role', 32)
                        ->default('direct_b2b')
                        ->after('name');
                }

                if (! Schema::hasColumn('business_categories', 'description')) {
                    $table->text('description')
                        ->nullable()
                        ->after('channel_role');
                }
            });

            try {
                Schema::table('business_categories', function (Blueprint $table) {
                    $table->dropUnique('business_categories_name_unique');
                });
            } catch (\Throwable) {
                // Already dropped
            }

            Schema::table('business_categories', function (Blueprint $table) {
                $table->unique(['tenant_id', 'name'], 'business_categories_tenant_name_unique');
                $table->index(['tenant_id', 'industry_id', 'is_active'], 'bus_cat_tenant_ind_active_idx');
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS bus_cat_tenant_coalesce_lower_name_uniq ON business_categories ((COALESCE(tenant_id, 0)), LOWER(name))');
            }
        }

        // 4. Add business_category_id to Industry Intelligence Newsletter tables for 3D search & caching
        if (Schema::hasTable('industry_news_sync_logs')) {
            Schema::table('industry_news_sync_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('industry_news_sync_logs', 'business_category_id')) {
                    $table->foreignId('business_category_id')
                        ->nullable()
                        ->after('sub_industry_id')
                        ->constrained('business_categories')
                        ->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('industry_news_articles')) {
            Schema::table('industry_news_articles', function (Blueprint $table) {
                if (! Schema::hasColumn('industry_news_articles', 'business_category_id')) {
                    $table->foreignId('business_category_id')
                        ->nullable()
                        ->after('sub_industry_id')
                        ->constrained('business_categories')
                        ->nullOnDelete();
                    $table->index(
                        ['tenant_id', 'industry_id', 'sub_industry_id', 'business_category_id'],
                        'ind_news_art_3d_taxonomy_idx'
                    );
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('industry_news_articles') && Schema::hasColumn('industry_news_articles', 'business_category_id')) {
            Schema::table('industry_news_articles', function (Blueprint $table) {
                $table->dropIndex('ind_news_art_3d_taxonomy_idx');
                $table->dropConstrainedForeignId('business_category_id');
            });
        }

        if (Schema::hasTable('industry_news_sync_logs') && Schema::hasColumn('industry_news_sync_logs', 'business_category_id')) {
            Schema::table('industry_news_sync_logs', function (Blueprint $table) {
                $table->dropConstrainedForeignId('business_category_id');
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS bus_cat_tenant_coalesce_lower_name_uniq');
            DB::statement('DROP INDEX IF EXISTS industries_tenant_coalesce_lower_name_uniq');
        }
    }
};
