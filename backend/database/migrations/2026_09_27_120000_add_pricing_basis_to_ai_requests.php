<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records whether a logged cost was measured or guessed.
 *
 * estimateCost() uses the model's real per-1M-token prices when both are set, and
 * otherwise falls back to a coarse guess keyed off cost_tier ($0.15-$5 in, $0.60-$15
 * out). Only 2 of 50 models carry real prices, and the two numbers were stored and
 * displayed identically — so a total on the Usage & Health page could be mostly fiction
 * with nothing to say so. For deepseek-v4-pro the "high" tier guess would overstate
 * input cost by nearly 4x.
 *
 * Additive and nullable: rows written before this stay unlabelled, which is honest —
 * we genuinely cannot tell which basis they used.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_requests') || Schema::hasColumn('ai_requests', 'pricing_basis')) {
            return;
        }

        Schema::table('ai_requests', function (Blueprint $table) {
            // 'measured' = the model's own per-token prices. 'estimated' = tier fallback.
            $table->string('pricing_basis', 16)->nullable()->after('estimated_cost_usd');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_requests') && Schema::hasColumn('ai_requests', 'pricing_basis')) {
            Schema::table('ai_requests', function (Blueprint $table) {
                $table->dropColumn('pricing_basis');
            });
        }
    }
};
