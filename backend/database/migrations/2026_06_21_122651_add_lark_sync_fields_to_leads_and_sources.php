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
        Schema::table('leads', function (Blueprint $table) {
            $table->string('external_id')->nullable()->index()->after('tenant_id');
        });

        Schema::table('lead_sources', function (Blueprint $table) {
            $table->string('lark_app_token')->nullable()->after('source_ref');
            $table->string('lark_table_id')->nullable()->after('lark_app_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('external_id');
        });

        Schema::table('lead_sources', function (Blueprint $table) {
            $table->dropColumn(['lark_app_token', 'lark_table_id']);
        });
    }
};
