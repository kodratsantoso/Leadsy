<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_qualifications', function (Blueprint $table) {
            $table->string('classification')->nullable()->after('qualified');
            $table->unsignedSmallInteger('score')->nullable()->after('classification');
            $table->json('dimension_breakdown')->nullable()->after('score');
            $table->json('risk_flags')->nullable()->after('dimension_breakdown');
            $table->json('hard_stops')->nullable()->after('risk_flags');
            $table->text('recommendation')->nullable()->after('hard_stops');
            $table->json('evaluation_snapshot')->nullable()->after('recommendation');
        });
    }

    public function down(): void
    {
        Schema::table('lead_qualifications', function (Blueprint $table) {
            $table->dropColumn([
                'classification',
                'score',
                'dimension_breakdown',
                'risk_flags',
                'hard_stops',
                'recommendation',
                'evaluation_snapshot',
            ]);
        });
    }
};
