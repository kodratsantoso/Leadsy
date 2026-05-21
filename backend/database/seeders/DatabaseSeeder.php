<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Default seeder — used for local development only.
 * Runs the full stack: production baseline + development sample data.
 *
 * Called by `php artisan db:seed` (no --class flag) via the dev entrypoint.
 * In production, the entrypoint calls ProductionSeeder directly.
 * In development/staging, set SEED_DEMO_DATA=true to also run DemoSeeder.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DevelopmentSeeder::class);

        // Legacy DemoSeeder — kept for backward compatibility with existing
        // local setups. New sample data should go into development/SampleLeadSeeder.
        if (app()->environment('local', 'development', 'staging') || env('SEED_DEMO_DATA', false)) {
            $this->call(DemoSeeder::class);
        }
    }
}
