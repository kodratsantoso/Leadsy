<?php

namespace Database\Seeders\Development;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SalesTeamSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default-workspace'],
            ['name' => 'Default Workspace', 'status' => 'active']
        );

        $defaultPassword = Hash::make('password');

        // 1. VP of Sales
        $vp = User::updateOrCreate(
            ['email' => 'vp@leadsy.ai'],
            [
                'name' => 'VP of Sales',
                'password' => $defaultPassword,
                'role_id' => 3, // sales_manager
                'tenant_id' => $tenant->id,
                'tier_level' => 'VP',
                'buffer_rate' => 20.00,
                'target_revenue' => 1200000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        // 2. Managers
        $m1 = User::updateOrCreate(
            ['email' => 'manager1@leadsy.ai'],
            [
                'name' => 'Sales Manager 1',
                'password' => $defaultPassword,
                'role_id' => 3, // sales_manager
                'tenant_id' => $tenant->id,
                'tier_level' => 'MANAGER',
                'direct_manager_id' => $vp->id,
                'target_revenue' => 600000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        $m2 = User::updateOrCreate(
            ['email' => 'manager2@leadsy.ai'],
            [
                'name' => 'Sales Manager 2',
                'password' => $defaultPassword,
                'role_id' => 3, // sales_manager
                'tenant_id' => $tenant->id,
                'tier_level' => 'MANAGER',
                'direct_manager_id' => $vp->id,
                'target_revenue' => 600000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        // 3. Senior AEs
        $srae1 = User::updateOrCreate(
            ['email' => 'srae1@leadsy.ai'],
            [
                'name' => 'Senior AE 1',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'SR_AE',
                'direct_manager_id' => $m1->id,
                'target_revenue' => 250000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        $srae2 = User::updateOrCreate(
            ['email' => 'srae2@leadsy.ai'],
            [
                'name' => 'Senior AE 2',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'SR_AE',
                'direct_manager_id' => $m2->id,
                'target_revenue' => 250000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        // 4. Junior AEs
        $jrae1 = User::updateOrCreate(
            ['email' => 'jrae1@leadsy.ai'],
            [
                'name' => 'Junior AE 1',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'JR_AE',
                'direct_manager_id' => $m1->id,
                'target_revenue' => 175000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        $jrae2 = User::updateOrCreate(
            ['email' => 'jrae2@leadsy.ai'],
            [
                'name' => 'Junior AE 2',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'JR_AE',
                'direct_manager_id' => $m1->id,
                'target_revenue' => 175000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        $jrae3 = User::updateOrCreate(
            ['email' => 'jrae3@leadsy.ai'],
            [
                'name' => 'Junior AE 3',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'JR_AE',
                'direct_manager_id' => $m2->id,
                'target_revenue' => 175000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        $jrae4 = User::updateOrCreate(
            ['email' => 'jrae4@leadsy.ai'],
            [
                'name' => 'Junior AE 4',
                'password' => $defaultPassword,
                'role_id' => 4, // sales_exec
                'tenant_id' => $tenant->id,
                'tier_level' => 'JR_AE',
                'direct_manager_id' => $m2->id,
                'target_revenue' => 175000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        // 5. SDRs
        User::updateOrCreate(
            ['email' => 'sdr1@leadsy.ai'],
            [
                'name' => 'SDR 1',
                'password' => $defaultPassword,
                'role_id' => 5, // presales
                'tenant_id' => $tenant->id,
                'tier_level' => 'SDR',
                'direct_manager_id' => $m1->id,
                'target_revenue' => 2400000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'sdr2@leadsy.ai'],
            [
                'name' => 'SDR 2',
                'password' => $defaultPassword,
                'role_id' => 5, // presales
                'tenant_id' => $tenant->id,
                'tier_level' => 'SDR',
                'direct_manager_id' => $m2->id,
                'target_revenue' => 2400000000.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        // 6. Solution Architects (Presales)
        User::updateOrCreate(
            ['email' => 'sa1@leadsy.ai'],
            [
                'name' => 'Solution Architect 1',
                'password' => $defaultPassword,
                'role_id' => 5, // presales
                'tenant_id' => $tenant->id,
                'tier_level' => 'PRESALES',
                'direct_manager_id' => $m1->id,
                'target_revenue' => 50.00, // 50 assigned opportunities target
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'sa2@leadsy.ai'],
            [
                'name' => 'Solution Architect 2',
                'password' => $defaultPassword,
                'role_id' => 5, // presales
                'tenant_id' => $tenant->id,
                'tier_level' => 'PRESALES',
                'direct_manager_id' => $m2->id,
                'target_revenue' => 50.00,
                'target_period' => 'monthly',
                'is_active' => true,
            ]
        );
    }
}
