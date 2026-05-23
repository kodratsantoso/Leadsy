<?php

namespace Database\Seeders\Production;

use App\Models\DiscoveryCategory;
use Illuminate\Database\Seeder;

class DiscoveryCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['label' => 'Restaurant / F&B',       'value' => 'restaurant', 'sort_order' => 1],
            ['label' => 'Cafe / Coffee Shop',      'value' => 'cafe',       'sort_order' => 2],
            ['label' => 'Hotel / Accommodation',   'value' => 'lodging',    'sort_order' => 3],
            ['label' => 'Retail Store',            'value' => 'store',      'sort_order' => 4],
            ['label' => 'Corporate Office',        'value' => 'office',     'sort_order' => 5],
            ['label' => 'Manufacturing / Factory', 'value' => 'factory',    'sort_order' => 6],
            ['label' => 'Hospital / Clinic',       'value' => 'hospital',   'sort_order' => 7],
            ['label' => 'Bank / Finance',          'value' => 'bank',       'sort_order' => 8],
            ['label' => 'School / University',     'value' => 'school',     'sort_order' => 9],
            ['label' => 'Supermarket / Grocery',   'value' => 'supermarket', 'sort_order' => 10],
            ['label' => 'Gas Station',             'value' => 'gas_station', 'sort_order' => 11],
            ['label' => 'Pharmacy',                'value' => 'pharmacy',   'sort_order' => 12],
            ['label' => 'Warehouse / Storage',     'value' => 'storage',    'sort_order' => 13],
            ['label' => 'Automotive / Workshop',   'value' => 'car_repair', 'sort_order' => 14],
        ];

        foreach ($categories as $cat) {
            DiscoveryCategory::updateOrCreate(
                ['value' => $cat['value']],
                array_merge($cat, ['is_active' => true])
            );
        }
    }
}
