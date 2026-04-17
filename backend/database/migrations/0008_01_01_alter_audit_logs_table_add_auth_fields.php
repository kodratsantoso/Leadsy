<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('request_method', 10)->nullable()->after('record_id');
            $table->string('route_path')->nullable()->after('request_method');
            $table->string('status', 50)->default('success')->after('route_path'); // success, failed, denied
            $table->json('metadata_json')->nullable()->after('user_agent');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn(['request_method', 'route_path', 'status', 'metadata_json']);
        });
    }
};
