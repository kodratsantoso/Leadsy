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
        Schema::create('lead_battle_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('competitor_name');
            $table->json('advantages')->nullable()->comment('Our solution advantages against this competitor');
            $table->json('weaknesses')->nullable()->comment('Competitor vulnerabilities or limitations');
            $table->json('counter_tactics')->nullable()->comment('Tactics to neutralize competitor claims');
            $table->json('key_talking_points')->nullable()->comment('Pithy talk tracks for the sales rep');
            $table->json('pricing_intelligence')->nullable()->comment('Pricing notes or positioning against competitor');
            $table->string('source')->default('ai_generated')->comment('ai_generated, manual, transcript_extraction');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['lead_id', 'competitor_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_battle_cards');
    }
};
