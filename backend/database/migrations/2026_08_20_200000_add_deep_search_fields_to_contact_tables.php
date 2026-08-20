<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Deep search enrichment fields on lead_contacts
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->boolean('email_verified')->default(false)->after('phone');
            $table->string('email_source', 40)->nullable()->after('email_verified');
            $table->string('department')->nullable()->after('email_source');
            $table->string('seniority_level', 40)->nullable()->after('department');
        });

        // Deep search enrichment fields on contact_enrichment_candidates
        Schema::table('contact_enrichment_candidates', function (Blueprint $table) {
            $table->string('email')->nullable()->after('company_domain');
            $table->string('phone', 30)->nullable()->after('email');
            $table->boolean('email_verified')->default(false)->after('phone');
            $table->string('department')->nullable()->after('email_verified');
            $table->string('seniority_level', 40)->nullable()->after('department');
            $table->string('search_depth', 20)->default('shallow')->after('seniority_level');
            $table->json('validation_log')->nullable()->after('raw_reveal');
        });
    }

    public function down(): void
    {
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->dropColumn(['email_verified', 'email_source', 'department', 'seniority_level']);
        });

        Schema::table('contact_enrichment_candidates', function (Blueprint $table) {
            $table->dropColumn(['email', 'phone', 'email_verified', 'department', 'seniority_level', 'search_depth', 'validation_log']);
        });
    }
};
