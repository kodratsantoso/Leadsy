<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_ai_analyses', function (Blueprint $table) {
            $table->text('company_summary')->nullable()->after('relevance_score');
            $table->text('potential_use_case')->nullable()->after('business_opportunity_summary');
            $table->text('risk_insight')->nullable()->after('suggested_approach');
        });
    }

    public function down(): void
    {
        Schema::table('lead_ai_analyses', function (Blueprint $table) {
            $table->dropColumn([
                'company_summary',
                'potential_use_case',
                'risk_insight',
            ]);
        });
    }
};
