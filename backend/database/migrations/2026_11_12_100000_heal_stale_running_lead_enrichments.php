<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Heals historical leads stuck in 'running' enrichment status.
     */
    public function up(): void
    {
        // 1. Mark leads as completed if they already have an AI score or AI status completed
        DB::table('leads')
            ->where('enrichment_status', 'running')
            ->where(function ($query) {
                $query->whereNotNull('lead_score')
                    ->orWhere('ai_processing_status', 'completed');
            })
            ->update([
                'enrichment_status' => 'completed',
                'updated_at' => now(),
            ]);

        // 2. Mark truly abandoned leads (running for more than 1 hour) as completed so they are not blocked
        DB::table('leads')
            ->where('enrichment_status', 'running')
            ->where(function ($query) {
                $query->where('last_enriched_at', '<', now()->subHours(1))
                    ->orWhere(function ($sub) {
                        $sub->whereNull('last_enriched_at')
                            ->where('created_at', '<', now()->subHours(1));
                    });
            })
            ->update([
                'enrichment_status' => 'completed',
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-destructive data healing migration; no schema rollback needed.
    }
};
