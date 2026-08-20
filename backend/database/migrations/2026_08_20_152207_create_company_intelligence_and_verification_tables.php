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
        // 1. Company Verifications Table
        Schema::create('company_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('legal_name_resolved')->nullable();
            $table->string('legal_status')->default('UNVERIFIED'); // VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, CONFLICTING_DATA
            $table->integer('legal_confidence')->default(0);
            $table->integer('entity_match_confidence')->default(0);
            $table->integer('operational_confidence')->default(0);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        // 2. Company Verification Evidence Table
        Schema::create('company_verification_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('verification_id')->constrained('company_verifications')->onDelete('cascade');
            $table->string('source_type'); // AHU, OSS, IDX, KSEI, OJK, BPOM, DJKI, website, linkedin, news
            $table->string('source_name');
            $table->text('source_url')->nullable();
            $table->string('evidence_type'); // registration, active_license, trademark, listing_status, website_activity
            $table->text('raw_value')->nullable();
            $table->text('normalized_value')->nullable();
            $table->integer('confidence')->default(0);
            $table->timestamp('retrieved_at')->nullable();
            $table->timestamps();
        });

        // 3. Company Aliases Table
        Schema::create('company_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('alias_value');
            $table->string('alias_type')->default('brand'); // brand, trading_name, legal_name, parent_company, subsidiary
            $table->string('source')->nullable();
            $table->boolean('verified')->default(false);
            $table->timestamps();
            
            $table->unique(['lead_id', 'alias_value', 'alias_type']);
        });

        // 4. IDX Public Company Profiles Table
        Schema::create('idx_company_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('ticker')->unique();
            $table->string('isin')->nullable();
            $table->date('listing_date')->nullable();
            $table->string('listing_status')->default('Active');
            $table->string('sector')->nullable();
            $table->string('sub_sector')->nullable();
            $table->bigInteger('shares_outstanding')->nullable();
            $table->string('controlling_shareholder')->nullable();
            $table->json('raw_payload_json')->nullable();
            $table->timestamps();
        });

        // 5. Company Financial Snapshots Table
        Schema::create('company_financial_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('period_type'); // FY, H1, Q1, Q2, Q3, 9M
            $table->integer('fiscal_year');
            $table->date('period_end_date')->nullable();
            $table->string('currency', 10)->default('IDR');
            $table->string('metric'); // revenue, gross_profit, operating_profit, net_income, total_assets, total_liabilities, cash, ocf, capex
            $table->decimal('raw_value', 20, 2)->nullable();
            $table->decimal('normalized_value', 20, 2)->nullable(); // Value normalized in standard base currency (IDR)
            $table->text('source_url')->nullable();
            $table->timestamp('retrieved_at')->nullable();
            $table->timestamps();

            $table->unique(['lead_id', 'period_type', 'fiscal_year', 'metric']);
        });

        // 6. Company Intelligence Signals Table (Budget, Appetite, Why Now)
        Schema::create('company_intelligence_signals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->string('signal_type'); // budget_capacity, investment_appetite, why_now
            $table->string('level'); // VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH, UNKNOWN
            $table->integer('score')->default(0);
            $table->integer('confidence')->default(0);
            $table->text('evidence_summary')->nullable(); // Explains why this signal exists
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->unique(['lead_id', 'signal_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_intelligence_signals');
        Schema::dropIfExists('company_financial_snapshots');
        Schema::dropIfExists('idx_company_profiles');
        Schema::dropIfExists('company_aliases');
        Schema::dropIfExists('company_verification_evidence');
        Schema::dropIfExists('company_verifications');
    }
};
