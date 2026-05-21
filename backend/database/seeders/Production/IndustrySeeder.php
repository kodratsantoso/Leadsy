<?php

namespace Database\Seeders\Production;

use App\Models\Industry;
use App\Models\SubIndustry;
use Illuminate\Database\Seeder;

class IndustrySeeder extends Seeder
{
    public function run(): void
    {
        $industries = [
            'Manufacturing' => [
                'Food & Beverage Manufacturing',
                'Textile & Apparel',
                'Chemical & Plastics',
                'Electronics & Components',
                'Heavy Equipment',
            ],
            'Retail & Distribution' => [
                'FMCG / Consumer Goods',
                'Wholesale Distribution',
                'E-commerce & Marketplace',
                'Specialty Retail',
            ],
            'Technology & IT Services' => [
                'Software Development',
                'IT Infrastructure',
                'Cybersecurity',
                'Cloud Services',
                'Data Analytics',
            ],
            'Finance & Banking' => [
                'Commercial Banking',
                'Insurance',
                'Investment & Asset Management',
                'Fintech',
            ],
            'Property & Construction' => [
                'Residential Development',
                'Commercial Real Estate',
                'Infrastructure & Civil',
                'Interior & Fit-Out',
            ],
            'Healthcare & Pharmaceuticals' => [
                'Hospital & Clinic',
                'Pharmaceutical Distribution',
                'Medical Devices',
                'Health Tech',
            ],
            'Logistics & Transportation' => [
                'Freight & Forwarding',
                'Last-Mile Delivery',
                'Warehousing & 3PL',
                'Fleet Management',
            ],
            'Education & Training' => [
                'K-12 Schools',
                'Higher Education',
                'Vocational Training',
                'EdTech',
            ],
            'Food & Beverage (F&B)' => [
                'Restaurant & Cafe',
                'Food Processing',
                'Catering & Events',
                'Franchise F&B',
            ],
            'Energy & Utilities' => [
                'Oil & Gas',
                'Renewable Energy',
                'Power Generation',
                'Water & Waste Management',
            ],
        ];

        foreach ($industries as $industryName => $subIndustries) {
            $industry = Industry::updateOrCreate(
                ['name' => $industryName],
                ['is_active' => true]
            );

            foreach ($subIndustries as $subName) {
                SubIndustry::firstOrCreate(
                    ['name' => $subName, 'industry_id' => $industry->id]
                );
            }
        }
    }
}
