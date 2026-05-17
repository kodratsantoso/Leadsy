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
        Schema::create('lead_channel_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_source_type_id')->constrained('lead_source_types')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('lead_sources', function (Blueprint $table) {
            $table->foreignId('channel_type_id')->nullable()->after('source_type')->constrained('lead_channel_types')->nullOnDelete();
        });

        $defaults = [
            'google_maps' => [
                ['Maps Search', 'maps_search'],
                ['Place Detail', 'place_detail'],
                ['Bulk Map Import', 'bulk_map_import'],
            ],
            'manual' => [
                ['Sales Input', 'sales_input'],
                ['Admin Input', 'admin_input'],
                ['Field Visit', 'field_visit'],
            ],
            'csv_import' => [
                ['Spreadsheet Upload', 'spreadsheet_upload'],
                ['CRM Export', 'crm_export'],
            ],
            'website' => [
                ['Contact Form', 'contact_form'],
                ['Website Research', 'website_research'],
                ['Inbound Demo Request', 'inbound_demo_request'],
            ],
            'linkedin' => [
                ['Company Search', 'company_search'],
                ['Sales Navigator', 'sales_navigator'],
                ['Direct Message', 'direct_message'],
            ],
            'referral' => [
                ['Customer Referral', 'customer_referral'],
                ['Partner Referral', 'partner_referral'],
                ['Employee Referral', 'employee_referral'],
            ],
            'public_directory' => [
                ['Association Directory', 'association_directory'],
                ['Marketplace Directory', 'marketplace_directory'],
                ['Government Directory', 'government_directory'],
            ],
            'whatsapp' => [
                ['Incoming Chat', 'incoming_chat'],
                ['Broadcast Reply', 'broadcast_reply'],
                ['Manual Chat Sync', 'manual_chat_sync'],
            ],
            'other' => [
                ['Unclassified', 'unclassified'],
            ],
        ];

        foreach ($defaults as $sourceSlug => $channels) {
            $sourceId = DB::table('lead_source_types')->where('slug', $sourceSlug)->value('id');
            if (! $sourceId) {
                continue;
            }

            foreach ($channels as $index => [$name, $slug]) {
                DB::table('lead_channel_types')->updateOrInsert(
                    ['slug' => $slug],
                    [
                        'lead_source_type_id' => $sourceId,
                        'name' => $name,
                        'description' => Str::headline(str_replace(['-', '_'], ' ', $sourceSlug)) . ' channel',
                        'sort_order' => ($index + 1) * 10,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        Schema::table('lead_sources', function (Blueprint $table) {
            $table->dropConstrainedForeignId('channel_type_id');
        });

        Schema::dropIfExists('lead_channel_types');
    }
};
