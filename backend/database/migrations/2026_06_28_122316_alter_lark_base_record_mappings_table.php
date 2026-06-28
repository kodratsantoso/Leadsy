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
        Schema::table('lark_base_record_mappings', function (Blueprint $table) {
            $table->string('lark_app_token')->nullable()->after('leadsy_entity_id');
            $table->string('lark_table_id')->nullable()->after('lark_app_token');
            $table->string('leadsy_record_id_value')->nullable()->after('lark_record_id');
            $table->string('sync_status')->default('pending')->after('leadsy_record_id_value');
            $table->timestamp('last_synced_at')->nullable()->after('sync_status');
            $table->text('last_sync_error')->nullable()->after('last_synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lark_base_record_mappings', function (Blueprint $table) {
            $table->dropColumn([
                'lark_app_token',
                'lark_table_id',
                'leadsy_record_id_value',
                'sync_status',
                'last_synced_at',
                'last_sync_error'
            ]);
        });
    }
};
