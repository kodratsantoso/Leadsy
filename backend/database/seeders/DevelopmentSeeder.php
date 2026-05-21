<?php

namespace Database\Seeders;

use Database\Seeders\Development\SampleLeadSeeder;
use Illuminate\Database\Seeder;

/**
 * Orchestrates all development / staging seeds.
 * Calls ProductionSeeder first to guarantee baseline data exists,
 * then adds development-only sample records on top.
 *
 * NEVER called in production — the entrypoint calls ProductionSeeder directly.
 * DatabaseSeeder calls this class for full local dev setup.
 */
class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        // Production baseline first — always required
        $this->call(ProductionSeeder::class);

        // Development-only data — never runs in production
        $this->call([
            SampleLeadSeeder::class,
        ]);
    }
}
