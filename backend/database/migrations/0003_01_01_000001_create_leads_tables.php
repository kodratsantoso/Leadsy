<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BRD §3.3 / §3.5 / §3.6 / §3.7 – Leads, contacts, sources, territories
 */
return new class extends Migration
{
    public function up(): void
    {
        // Territories / saved search areas  (BRD §3.1)
        Schema::create('territories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('center_lat', 10, 7);
            $table->decimal('center_lng', 10, 7);
            $table->unsignedInteger('radius_meters');
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Contact-source lookup  (BRD §4.4)
        Schema::create('contact_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // LinkedIn, Website, Google Maps…
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Leads – company-level  (BRD §3.3 / §3.5)
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->text('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('website')->nullable();
            $table->string('website_domain')->nullable()->index();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();

            $table->foreignId('industry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sub_industry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('business_category')->nullable();

            // Enrichment fields
            $table->string('company_size_estimate')->nullable();
            $table->unsignedSmallInteger('branch_count')->nullable();
            $table->string('operating_hours')->nullable();
            $table->json('social_profiles')->nullable();

            // Scoring
            $table->unsignedSmallInteger('lead_score')->nullable();          // 0-100
            $table->enum('qualification_status', ['pending', 'eligible', 'potential', 'not_eligible'])->default('pending');
            $table->text('ai_explanation')->nullable();

            // Deduplication  (BRD §3.7)
            $table->enum('duplicate_status', ['new', 'exact_duplicate', 'probable_duplicate', 'existing_new_pic', 'manual_review'])->default('new');
            $table->foreignId('duplicate_of_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->string('external_place_id')->nullable()->index();

            // AI mode  (BRD §3.11)
            $table->boolean('use_ai_reference')->default(false);
            $table->enum('ai_mode', ['full_ai', 'hybrid', 'manual'])->default('manual');
            $table->enum('ai_reference_source_type', ['document', 'url', 'master_product'])->nullable();
            $table->unsignedBigInteger('ai_reference_id')->nullable();
            $table->enum('ai_processing_status', ['pending', 'processing', 'completed', 'failed'])->nullable();

            // Funnel  (BRD §3.8)
            $table->foreignId('funnel_stage_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();

            // Territory link
            $table->foreignId('territory_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Lead contacts / PIC  (BRD §3.5 columns)
        Schema::create('lead_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('title')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('linkedin_url')->nullable();
            $table->foreignId('contact_source_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('confidence', ['high', 'medium', 'low'])->default('medium');
            $table->date('last_verified_at')->nullable();
            $table->boolean('do_not_contact')->default(false);
            $table->timestamps();
        });

        // Lead sources – track origin of each lead  (BRD §7.6)
        Schema::create('lead_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('source_type');   // google_maps, manual, csv_import …
            $table->string('source_ref')->nullable();
            $table->enum('confidence', ['high', 'medium', 'low'])->default('medium');
            $table->date('last_verified_at')->nullable();
            $table->timestamps();
        });

        // Funnel movement history  (BRD §3.8)
        Schema::create('lead_funnel_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_stage_id')->nullable()->constrained('funnel_stages')->nullOnDelete();
            $table->foreignId('to_stage_id')->nullable()->constrained('funnel_stages')->nullOnDelete();
            $table->foreignId('moved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_funnel_history');
        Schema::dropIfExists('lead_sources');
        Schema::dropIfExists('lead_contacts');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('contact_sources');
        Schema::dropIfExists('territories');
    }
};
