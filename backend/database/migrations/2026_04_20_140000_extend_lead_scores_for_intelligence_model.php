<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_scores', function (Blueprint $table) {
            if (! Schema::hasColumn('lead_scores', 'calculated_at')) {
                $table->timestamp('calculated_at')->nullable()->after('grade');
                $table->index(['lead_id', 'calculated_at'], 'lead_scores_calculated_at_idx');
            }
        });

        DB::table('lead_scores')
            ->whereNull('calculated_at')
            ->update([
                'calculated_at' => DB::raw('COALESCE(last_scored_at, created_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('lead_scores', function (Blueprint $table) {
            if (Schema::hasColumn('lead_scores', 'calculated_at')) {
                $table->dropIndex('lead_scores_calculated_at_idx');
                $table->dropColumn('calculated_at');
            }
        });
    }
};
