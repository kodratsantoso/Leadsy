<?php

namespace Database\Seeders\Production;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $allPermIds   = Permission::pluck('id')->toArray();
        $leadProdIds  = Permission::whereIn('module', ['leads', 'products'])->pluck('id')->toArray();
        $execIds      = Permission::whereIn('name', ['leads.view', 'leads.create', 'leads.edit', 'products.view'])->pluck('id')->toArray();
        $presalesIds  = Permission::whereIn('name', ['leads.view', 'leads.create', 'products.view', 'products.edit', 'ai.manage'])->pluck('id')->toArray();
        $viewerIds    = Permission::whereIn('name', ['leads.view', 'products.view', 'audit.view'])->pluck('id')->toArray();

        $roles = [
            ['name' => 'super_admin',   'display_name' => 'Super Admin',                'perms' => $allPermIds],
            ['name' => 'admin',         'display_name' => 'Admin',                       'perms' => $allPermIds],
            ['name' => 'sales_manager', 'display_name' => 'Sales Manager',               'perms' => $leadProdIds],
            ['name' => 'sales_exec',    'display_name' => 'Sales / BD Executive',        'perms' => $execIds],
            ['name' => 'presales',      'display_name' => 'Presales / Research Analyst', 'perms' => $presalesIds],
            ['name' => 'viewer',        'display_name' => 'Viewer / Auditor',            'perms' => $viewerIds],
        ];

        foreach ($roles as $r) {
            $role = Role::updateOrCreate(
                ['name' => $r['name']],
                ['display_name' => $r['display_name']]
            );
            // syncWithoutDetaching keeps any manually added permissions intact
            $role->permissions()->syncWithoutDetaching($r['perms']);
        }
    }
}
