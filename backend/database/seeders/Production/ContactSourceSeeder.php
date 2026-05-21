<?php

namespace Database\Seeders\Production;

use App\Models\ContactSource;
use Illuminate\Database\Seeder;

class ContactSourceSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            'LinkedIn',
            'Website',
            'Google Maps',
            'Public Directory',
            'Manual Input',
            'Referral',
            'Other',
        ];

        foreach ($sources as $name) {
            ContactSource::firstOrCreate(['name' => $name]);
        }
    }
}
