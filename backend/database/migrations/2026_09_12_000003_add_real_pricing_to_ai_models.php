<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Replaces the crude 3-bucket cost_tier estimate with real, editable
     * per-model pricing (USD per 1M tokens), so AI cost capture reflects
     * what the provider actually charges instead of a tier guess.
     */
    public function up(): void
    {
        Schema::table('ai_models', function (Blueprint $table) {
            $table->decimal('cost_per_million_input_tokens', 12, 6)->nullable()->after('cost_tier');
            $table->decimal('cost_per_million_output_tokens', 12, 6)->nullable()->after('cost_per_million_input_tokens');
            // 'openrouter_api' = fetched live from OpenRouter's pricing-enabled models endpoint.
            // 'manual' = entered/edited by an admin (OpenAI/Anthropic/Gemini/etc. don't expose
            // pricing via their APIs, so this is the only option for those providers).
            $table->string('pricing_source', 20)->nullable()->after('cost_per_million_output_tokens');
            $table->timestamp('pricing_synced_at')->nullable()->after('pricing_source');
        });
    }

    public function down(): void
    {
        Schema::table('ai_models', function (Blueprint $table) {
            $table->dropColumn([
                'cost_per_million_input_tokens',
                'cost_per_million_output_tokens',
                'pricing_source',
                'pricing_synced_at',
            ]);
        });
    }
};
