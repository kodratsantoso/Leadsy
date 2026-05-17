<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_source_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $defaults = [
            ['Google Maps', 'google_maps', 'Lead discovered or imported from Google Maps.'],
            ['Manual Input', 'manual', 'Lead entered manually by the sales team.'],
            ['CSV Import', 'csv_import', 'Lead imported from a spreadsheet or CSV file.'],
            ['Website', 'website', 'Lead captured from website research or inbound form data.'],
            ['LinkedIn', 'linkedin', 'Lead sourced from LinkedIn research.'],
            ['Referral', 'referral', 'Lead received from a referral source.'],
            ['Public Directory', 'public_directory', 'Lead found in a public business directory.'],
            ['WhatsApp', 'whatsapp', 'Lead created or classified from WhatsApp interactions.'],
            ['Other', 'other', 'Fallback source for uncategorized leads.'],
        ];

        foreach ($defaults as $index => [$name, $slug, $description]) {
            DB::table('lead_source_types')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'description' => $description,
                    'sort_order' => ($index + 1) * 10,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }

        $existingSourceTypes = DB::table('lead_sources')
            ->select('source_type')
            ->whereNotNull('source_type')
            ->distinct()
            ->pluck('source_type');

        foreach ($existingSourceTypes as $sourceType) {
            if (! DB::table('lead_source_types')->where('slug', $sourceType)->exists()) {
                DB::table('lead_source_types')->insert([
                    'name' => Str::headline(str_replace(['-', '_'], ' ', $sourceType)),
                    'slug' => $sourceType,
                    'sort_order' => 900,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_source_types');
    }
};
