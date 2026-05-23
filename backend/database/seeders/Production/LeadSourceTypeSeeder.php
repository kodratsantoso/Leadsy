<?php

namespace Database\Seeders\Production;

use App\Models\LeadChannelType;
use App\Models\LeadSourceType;
use Illuminate\Database\Seeder;

/**
 * Ensures lead_source_types and lead_channel_types contain the baseline taxonomy.
 * The migration already inserts these on first run; this seeder ensures they can
 * be restored by re-running ProductionSeeder without re-running migrations.
 */
class LeadSourceTypeSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            ['name' => 'Google Maps',      'slug' => 'google_maps',      'description' => 'Lead discovered or imported from Google Maps.',              'sort_order' => 10],
            ['name' => 'Manual Input',     'slug' => 'manual',           'description' => 'Lead entered manually by the sales team.',                   'sort_order' => 20],
            ['name' => 'CSV Import',       'slug' => 'csv_import',       'description' => 'Lead imported from a spreadsheet or CSV file.',              'sort_order' => 30],
            ['name' => 'Website',          'slug' => 'website',          'description' => 'Lead captured from website research or inbound form data.',  'sort_order' => 40],
            ['name' => 'LinkedIn',         'slug' => 'linkedin',         'description' => 'Lead sourced from LinkedIn research.',                       'sort_order' => 50],
            ['name' => 'Referral',         'slug' => 'referral',         'description' => 'Lead received from a referral source.',                      'sort_order' => 60],
            ['name' => 'Public Directory', 'slug' => 'public_directory', 'description' => 'Lead found in a public business directory.',                'sort_order' => 70],
            ['name' => 'WhatsApp',         'slug' => 'whatsapp',         'description' => 'Lead created or classified from WhatsApp interactions.',     'sort_order' => 80],
            ['name' => 'Other',            'slug' => 'other',            'description' => 'Fallback source for uncategorized leads.',                   'sort_order' => 90],
        ];

        foreach ($sources as $s) {
            LeadSourceType::updateOrCreate(['slug' => $s['slug']], array_merge($s, ['is_active' => true]));
        }

        $channels = [
            'google_maps' => [['Maps Search', 'maps_search'], ['Place Detail', 'place_detail'], ['Bulk Map Import', 'bulk_map_import']],
            'manual' => [['Sales Input', 'sales_input'], ['Admin Input', 'admin_input'], ['Field Visit', 'field_visit']],
            'csv_import' => [['Spreadsheet Upload', 'spreadsheet_upload'], ['CRM Export', 'crm_export']],
            'website' => [['Contact Form', 'contact_form'], ['Website Research', 'website_research'], ['Inbound Demo Request', 'inbound_demo_request']],
            'linkedin' => [['Company Search', 'company_search'], ['Sales Navigator', 'sales_navigator'], ['Direct Message', 'direct_message']],
            'referral' => [['Customer Referral', 'customer_referral'], ['Partner Referral', 'partner_referral'], ['Employee Referral', 'employee_referral']],
            'public_directory' => [['Association Directory', 'association_directory'], ['Marketplace Directory', 'marketplace_directory'], ['Government Directory', 'government_directory']],
            'whatsapp' => [['Incoming Chat', 'incoming_chat'], ['Broadcast Reply', 'broadcast_reply'], ['Manual Chat Sync', 'manual_chat_sync']],
            'other' => [['Unclassified', 'unclassified']],
        ];

        foreach ($channels as $sourceSlug => $channelList) {
            $source = LeadSourceType::where('slug', $sourceSlug)->first();
            if (! $source) {
                continue;
            }

            foreach ($channelList as $i => [$name, $slug]) {
                LeadChannelType::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'lead_source_type_id' => $source->id,
                        'name' => $name,
                        'sort_order' => ($i + 1) * 10,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
