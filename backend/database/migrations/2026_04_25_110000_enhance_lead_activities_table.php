<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            // Store outcome of the activity (e.g. "Decision maker met, follow-up scheduled")
            $table->string('outcome', 1000)->nullable()->after('description');
            // Allow caller to set a specific activity date/time rather than defaulting to now()
            $table->timestamp('activity_date_override')->nullable()->after('activity_date');
            // Scheduled next follow-up date (optional, surfaced in progress summary)
            $table->date('next_follow_up_date')->nullable()->after('activity_date_override');
        });
    }

    public function down(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->dropColumn(['outcome', 'activity_date_override', 'next_follow_up_date']);
        });
    }
};
