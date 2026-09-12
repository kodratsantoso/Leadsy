<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * whatsapp_sync_rules had no tenant scoping at all, and updateSyncRules()
     * called truncate() before re-inserting — one tenant saving their rules
     * wiped every other tenant's rules too (2026-09-13 audit). Existing rows
     * are treated as global defaults (tenant_id null) and stay visible to
     * every tenant until each tenant saves their own copy.
     */
    public function up(): void
    {
        Schema::table('whatsapp_sync_rules', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable()->after('id');
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_sync_rules', function (Blueprint $table) {
            $table->dropColumn('tenant_id');
        });
    }
};
