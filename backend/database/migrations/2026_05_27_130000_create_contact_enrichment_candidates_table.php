<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_enrichment_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('provider', 40);
            $table->string('provider_candidate_id');
            $table->string('name')->nullable();
            $table->string('title')->nullable();
            $table->string('company_name')->nullable();
            $table->string('company_domain')->nullable();
            $table->boolean('has_email')->default(false);
            $table->boolean('has_phone')->default(false);
            $table->unsignedSmallInteger('reveal_email_credits')->default(0);
            $table->unsignedSmallInteger('reveal_phone_credits')->default(0);
            $table->string('status', 30)->default('previewed');
            $table->json('raw_preview')->nullable();
            $table->json('raw_reveal')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revealed_at')->nullable();
            $table->timestamps();

            $table->unique(['lead_id', 'provider', 'provider_candidate_id'], 'lead_provider_candidate_unique');
            $table->index(['lead_id', 'provider', 'status'], 'contact_candidates_lead_provider_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_enrichment_candidates');
    }
};
