<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive migration to store full structured AI company profile and B2B sales notes on the leads table.
 * 
 * Safe migration: adds nullable column `ai_profile_json` without modifying or dropping any existing columns or data.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leads')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            if (! Schema::hasColumn('leads', 'ai_profile_json')) {
                $table->json('ai_profile_json')->nullable()->after('customer_story');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('leads')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'ai_profile_json')) {
                $table->dropColumn('ai_profile_json');
            }
        });
    }
};
