<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_categories', function (Blueprint $table) {
            if (!Schema::hasColumn('business_categories', 'code')) {
                $table->string('code')->nullable()->after('id');
            }
        });

        $categories = [
            ['code' => 'B2B', 'name' => 'Business to Business'],
            ['code' => 'B2C', 'name' => 'Business to Consumer'],
            ['code' => 'B2B2C', 'name' => 'Business to Business to Consumer'],
            ['code' => 'B2G', 'name' => 'Business to Government'],
            ['code' => 'G2B', 'name' => 'Government to Business'],
            ['code' => 'C2C', 'name' => 'Consumer to Consumer'],
            ['code' => 'D2C', 'name' => 'Direct to Consumer'],
            ['code' => 'Marketplace', 'name' => 'Marketplace Platform'],
            ['code' => 'Platform', 'name' => 'Digital Platform Business'],
            ['code' => 'SaaS', 'name' => 'Software as a Service'],
            ['code' => 'PaaS', 'name' => 'Platform as a Service'],
            ['code' => 'IaaS', 'name' => 'Infrastructure as a Service'],
            ['code' => 'Subscription', 'name' => 'Subscription-Based Business'],
            ['code' => 'Transactional', 'name' => 'Transaction-Based Business'],
            ['code' => 'Commission', 'name' => 'Commission-Based Business'],
            ['code' => 'Usage-Based', 'name' => 'Usage-Based / Pay-as-You-Go'],
            ['code' => 'Freemium', 'name' => 'Freemium Business Model'],
            ['code' => 'Franchise', 'name' => 'Franchise Business'],
            ['code' => 'Distributor', 'name' => 'Distributor'],
            ['code' => 'Wholesaler', 'name' => 'Wholesaler'],
            ['code' => 'Retailer', 'name' => 'Retailer'],
            ['code' => 'Manufacturer', 'name' => 'Manufacturer'],
            ['code' => 'OEM', 'name' => 'Original Equipment Manufacturer'],
            ['code' => 'ODM', 'name' => 'Original Design Manufacturer'],
            ['code' => 'White Label', 'name' => 'White Label Provider'],
            ['code' => 'Reseller', 'name' => 'Reseller'],
            ['code' => 'Dealer', 'name' => 'Dealer / Authorized Dealer'],
            ['code' => 'Agent', 'name' => 'Sales Agent / Broker'],
            ['code' => 'System Integrator', 'name' => 'System Integrator'],
            ['code' => 'Managed Service', 'name' => 'Managed Service Provider'],
            ['code' => 'Professional Service', 'name' => 'Professional Service Provider'],
            ['code' => 'Consulting', 'name' => 'Consulting / Advisory Firm'],
            ['code' => 'Agency', 'name' => 'Agency Business'],
            ['code' => 'Contractor', 'name' => 'Contractor / Project-Based Business'],
            ['code' => 'Outsourcing', 'name' => 'Outsourcing Provider'],
            ['code' => 'Staffing', 'name' => 'Staffing / Manpower Provider'],
            ['code' => 'Logistics Provider', 'name' => 'Logistics / Delivery Provider'],
            ['code' => 'Importer', 'name' => 'Importer'],
            ['code' => 'Exporter', 'name' => 'Exporter'],
            ['code' => 'Holding Company', 'name' => 'Holding / Investment Company'],
            ['code' => 'Conglomerate', 'name' => 'Conglomerate / Multi-Business Group'],
            ['code' => 'Branch Network', 'name' => 'Multi-Branch Business'],
            ['code' => 'Chain Store', 'name' => 'Chain Store / Outlet Network'],
            ['code' => 'Asset-Light', 'name' => 'Asset-Light Business'],
            ['code' => 'Asset-Heavy', 'name' => 'Asset-Heavy Business'],
            ['code' => 'Online-First', 'name' => 'Online-First Business'],
            ['code' => 'Offline-First', 'name' => 'Offline-First Business'],
            ['code' => 'Hybrid Online Offline', 'name' => 'Hybrid Online-Offline Business'],
            ['code' => 'Community-Based', 'name' => 'Community-Based Business'],
            ['code' => 'Non-Profit', 'name' => 'Non-Profit Organization'],
            ['code' => 'Cooperative', 'name' => 'Cooperative'],
            ['code' => 'Educational Institution', 'name' => 'Educational Institution'],
            ['code' => 'Healthcare Provider', 'name' => 'Healthcare Provider'],
            ['code' => 'Financial Institution', 'name' => 'Financial Institution'],
            ['code' => 'Public Sector Entity', 'name' => 'Public Sector Entity'],
            ['code' => 'Family Business', 'name' => 'Family-Owned Business'],
            ['code' => 'Startup', 'name' => 'Startup'],
            ['code' => 'Enterprise Group', 'name' => 'Enterprise / Corporate Group']
        ];

        foreach ($categories as $data) {
            DB::table('business_categories')->updateOrInsert(
                ['name' => $data['name']],
                ['code' => $data['code']]
            );
        }
    }

    public function down(): void
    {
        Schema::table('business_categories', function (Blueprint $table) {
            if (Schema::hasColumn('business_categories', 'code')) {
                $table->dropColumn('code');
            }
        });
    }
};
