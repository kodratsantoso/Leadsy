<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Orchestrates all baseline records required for production.
 * Safe to re-run on every deploy — all underlying seeders use firstOrCreate/upsert.
 *
 * Called by docker-entrypoint.production.sh when AUTO_SEED_BASELINE=true.
 * Do NOT add demo or sample lead data here — use DemoSeeder for that.
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DatabaseSeeder::class);
    }
}
