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
        // 1. Telemetry and active tracking on personal_access_tokens
        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                if (! Schema::hasColumn('personal_access_tokens', 'ip_address')) {
                    $table->string('ip_address', 45)->nullable()->after('abilities');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'user_agent')) {
                    $table->text('user_agent')->nullable()->after('ip_address');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'device_type')) {
                    $table->string('device_type', 30)->nullable()->after('user_agent');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'browser')) {
                    $table->string('browser', 50)->nullable()->after('device_type');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'os')) {
                    $table->string('os', 50)->nullable()->after('browser');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'city')) {
                    $table->string('city', 100)->nullable()->after('os');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'country_code')) {
                    $table->string('country_code', 10)->nullable()->after('city');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'country_name')) {
                    $table->string('country_name', 100)->nullable()->after('country_code');
                }
                if (! Schema::hasColumn('personal_access_tokens', 'last_active_at')) {
                    $table->timestamp('last_active_at')->nullable()->index()->after('last_used_at');
                }
            });
        }

        // 2. Enhanced audit log fields (Actor details, geolocation, client info, risk level)
        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                if (! Schema::hasColumn('audit_logs', 'city')) {
                    $table->string('city', 100)->nullable()->after('user_agent');
                }
                if (! Schema::hasColumn('audit_logs', 'country_code')) {
                    $table->string('country_code', 10)->nullable()->after('city');
                }
                if (! Schema::hasColumn('audit_logs', 'country_name')) {
                    $table->string('country_name', 100)->nullable()->after('country_code');
                }
                if (! Schema::hasColumn('audit_logs', 'region')) {
                    $table->string('region', 100)->nullable()->after('country_name');
                }
                if (! Schema::hasColumn('audit_logs', 'device_type')) {
                    $table->string('device_type', 30)->nullable()->after('region');
                }
                if (! Schema::hasColumn('audit_logs', 'browser')) {
                    $table->string('browser', 50)->nullable()->after('device_type');
                }
                if (! Schema::hasColumn('audit_logs', 'os')) {
                    $table->string('os', 50)->nullable()->after('browser');
                }
                if (! Schema::hasColumn('audit_logs', 'risk_level')) {
                    $table->string('risk_level', 20)->default('low')->index()->after('status');
                }
                if (! Schema::hasColumn('audit_logs', 'event_category')) {
                    $table->string('event_category', 50)->nullable()->index()->after('module');
                }
                if (! Schema::hasColumn('audit_logs', 'actor_email')) {
                    $table->string('actor_email', 255)->nullable()->after('user_id');
                }
                if (! Schema::hasColumn('audit_logs', 'actor_name')) {
                    $table->string('actor_name', 255)->nullable()->after('actor_email');
                }
                if (! Schema::hasColumn('audit_logs', 'actor_role')) {
                    $table->string('actor_role', 50)->nullable()->after('actor_name');
                }
                if (! Schema::hasColumn('audit_logs', 'tenant_name')) {
                    $table->string('tenant_name', 255)->nullable()->after('tenant_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $columns = ['ip_address', 'user_agent', 'device_type', 'browser', 'os', 'city', 'country_code', 'country_name', 'last_active_at'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('personal_access_tokens', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $columns = ['city', 'country_code', 'country_name', 'region', 'device_type', 'browser', 'os', 'risk_level', 'event_category', 'actor_email', 'actor_name', 'actor_role', 'tenant_name'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('audit_logs', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
