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
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->text('eligibility_reason')->nullable()->after('summary');
            $table->text('presales_analysis')->nullable()->after('eligibility_reason');
            $table->text('presales_recommendation')->nullable()->after('presales_analysis');
            $table->date('estimated_closing_date')->nullable()->after('recommended_product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->dropColumn([
                'eligibility_reason',
                'presales_analysis',
                'presales_recommendation',
                'estimated_closing_date'
            ]);
        });
    }
};
