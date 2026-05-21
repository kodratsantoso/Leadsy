<?php

namespace Database\Seeders;

use Database\Seeders\Production\AdminUserSeeder;
use Database\Seeders\Production\AiProviderSeeder;
use Database\Seeders\Production\ContactSourceSeeder;
use Database\Seeders\Production\DiscoveryCategorySeeder;
use Database\Seeders\Production\FunnelStageSeeder;
use Database\Seeders\Production\IndustrySeeder;
use Database\Seeders\Production\LeadSourceTypeSeeder;
use Database\Seeders\Production\NotificationDefaultSeeder;
use Database\Seeders\Production\PermissionSeeder;
use Database\Seeders\Production\RoleSeeder;
use Illuminate\Database\Seeder;

/**
 * Orchestrates all baseline records required for production.
 * Each sub-seeder is idempotent (updateOrCreate / firstOrCreate) and can be
 * re-run on every deploy without duplicating data.
 *
 * Execution order matters — RoleSeeder must run after PermissionSeeder,
 * NotificationDefaultSeeder must run after AdminUserSeeder (needs tenant id).
 *
 * Called by docker-entrypoint.production.sh when AUTO_SEED_BASELINE=true.
 * Do NOT add demo or sample lead data here.
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            FunnelStageSeeder::class,
            ContactSourceSeeder::class,
            AdminUserSeeder::class,
            IndustrySeeder::class,
            AiProviderSeeder::class,
            LeadSourceTypeSeeder::class,
            NotificationDefaultSeeder::class,
            DiscoveryCategorySeeder::class,
        ]);
    }
}
