<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive migration to persist structured AI Lead Profiling firmographics on `leads`
 * (5 scalar columns) and create relational `lead_office_locations` for multi-site
 * HQ, branches, plants/factories, and warehouses.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leads')) {
            Schema::table('leads', function (Blueprint $table) {
                if (! Schema::hasColumn('leads', 'legal_name')) {
                    $table->string('legal_name', 255)->nullable()->after('company_name');
                }
                if (! Schema::hasColumn('leads', 'ownership_type')) {
                    $table->string('ownership_type', 120)->nullable()->after('brand');
                }
                if (! Schema::hasColumn('leads', 'year_established')) {
                    $table->string('year_established', 16)->nullable()->after('ownership_type');
                }
                if (! Schema::hasColumn('leads', 'operational_scope')) {
                    $table->string('operational_scope', 120)->nullable()->after('company_size_estimate');
                }
                if (! Schema::hasColumn('leads', 'whatsapp')) {
                    $table->string('whatsapp', 40)->nullable()->after('phone');
                }
            });
        }

        if (! Schema::hasTable('lead_office_locations')) {
            Schema::create('lead_office_locations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->string('location_type', 80)->nullable();
                $table->string('label', 180)->nullable();
                $table->text('address')->nullable();
                $table->string('city', 120)->nullable();
                $table->string('province', 120)->nullable();
                $table->string('country', 100)->nullable()->default('Indonesia');
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
                $table->string('source', 50)->default('ai_profiling');
                $table->boolean('is_primary')->default(false);
                $table->timestamps();

                $table->index(['lead_id', 'city']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lead_office_locations')) {
            Schema::dropIfExists('lead_office_locations');
        }

        if (Schema::hasTable('leads')) {
            Schema::table('leads', function (Blueprint $table) {
                $cols = array_values(array_filter(
                    ['legal_name', 'ownership_type', 'year_established', 'operational_scope', 'whatsapp'],
                    fn (string $col) => Schema::hasColumn('leads', $col)
                ));
                if (! empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};
