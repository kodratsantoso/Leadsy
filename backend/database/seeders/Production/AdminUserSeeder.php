<?php

namespace Database\Seeders\Production;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Default workspace tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default-workspace'],
            ['name' => 'Default Workspace', 'status' => 'active']
        );

        $adminRole = Role::where('name', 'super_admin')->first();

        // Admin email and password are read from env so they can be customised
        // in Coolify without touching code. Defaults are safe placeholders only.
        $adminEmail = env('ADMIN_EMAIL') ?: 'admin@prasetia.com';
        $adminName = env('ADMIN_NAME') ?: 'Admin';
        $adminPassword = env('ADMIN_PASSWORD');
        $hasConfiguredPassword = is_string($adminPassword) && $adminPassword !== '';

        $adminUser = User::where('email', $adminEmail)->first();
        $attributes = [
            'name'      => $adminUser?->name ?: $adminName,
            'role_id'   => $adminRole?->id,
            'tenant_id' => $tenant->id,
            'is_active' => true,
        ];

        if (! $adminUser || $hasConfiguredPassword) {
            $attributes['password'] = Hash::make($hasConfiguredPassword ? $adminPassword : 'ChangeMe!123');
        }

        User::updateOrCreate(['email' => $adminEmail], $attributes);
    }
}
