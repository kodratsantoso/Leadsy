<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds sample/demo data for staging or demo environments only.
 * NEVER runs in production unless SEED_DEMO_DATA=true is explicitly set.
 *
 * Add demo leads, sample contacts, and test records here.
 * All entries must use firstOrCreate/updateOrCreate to remain idempotent.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // Add demo leads, sample contacts, and test records here.
        // Example:
        // Lead::firstOrCreate(['email' => 'demo.lead@example.com'], [...]);
    }
}
