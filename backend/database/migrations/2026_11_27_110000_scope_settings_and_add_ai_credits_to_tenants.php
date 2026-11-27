<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add AI credit columns to tenants table
        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                if (!Schema::hasColumn('tenants', 'ai_credits_balance')) {
                    $table->unsignedBigInteger('ai_credits_balance')->default(25000)->after('status');
                }
                if (!Schema::hasColumn('tenants', 'ai_credits_allocated')) {
                    $table->unsignedBigInteger('ai_credits_allocated')->default(25000)->after('ai_credits_balance');
                }
            });
        }

        // 2. Add tenant_id to tax_codes and adjust unique constraint
        if (Schema::hasTable('tax_codes')) {
            Schema::table('tax_codes', function (Blueprint $table) {
                if (!Schema::hasColumn('tax_codes', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
                }
            });

            // Drop old unique index if exists in postgres
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE tax_codes DROP CONSTRAINT IF EXISTS tax_codes_tax_code_unique');
            }
            // Add compound index for tenant-scoped uniqueness
            Schema::table('tax_codes', function (Blueprint $table) {
                $table->index(['tenant_id', 'tax_code']);
            });
        }

        // 3. Add tenant_id to withholding_tax_codes and adjust unique constraint
        if (Schema::hasTable('withholding_tax_codes')) {
            Schema::table('withholding_tax_codes', function (Blueprint $table) {
                if (!Schema::hasColumn('withholding_tax_codes', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
                }
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE withholding_tax_codes DROP CONSTRAINT IF EXISTS withholding_tax_codes_wht_code_unique');
            }
            Schema::table('withholding_tax_codes', function (Blueprint $table) {
                $table->index(['tenant_id', 'wht_code']);
            });
        }

        // 4. Add tenant_id to item_settings and adjust unique constraint
        if (Schema::hasTable('item_settings')) {
            Schema::table('item_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('item_settings', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
                }
            });

            if (DB::getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE item_settings DROP CONSTRAINT IF EXISTS item_settings_setting_key_unique');
            }
            Schema::table('item_settings', function (Blueprint $table) {
                $table->index(['tenant_id', 'setting_key']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tax_codes') && Schema::hasColumn('tax_codes', 'tenant_id')) {
            Schema::table('tax_codes', function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            });
        }

        if (Schema::hasTable('withholding_tax_codes') && Schema::hasColumn('withholding_tax_codes', 'tenant_id')) {
            Schema::table('withholding_tax_codes', function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            });
        }

        if (Schema::hasTable('item_settings') && Schema::hasColumn('item_settings', 'tenant_id')) {
            Schema::table('item_settings', function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            });
        }

        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                if (Schema::hasColumn('tenants', 'ai_credits_balance')) {
                    $table->dropColumn(['ai_credits_balance', 'ai_credits_allocated']);
                }
            });
        }
    }
};
