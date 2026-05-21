<?php

namespace Database\Seeders\Production;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'leads.view',         'module' => 'leads',        'display_name' => 'View Leads'],
            ['name' => 'leads.create',        'module' => 'leads',        'display_name' => 'Create Leads'],
            ['name' => 'leads.edit',          'module' => 'leads',        'display_name' => 'Edit Leads'],
            ['name' => 'leads.delete',        'module' => 'leads',        'display_name' => 'Delete Leads'],
            ['name' => 'leads.export',        'module' => 'leads',        'display_name' => 'Export Leads'],
            ['name' => 'leads.merge',         'module' => 'leads',        'display_name' => 'Approve Merge'],
            ['name' => 'products.view',       'module' => 'products',     'display_name' => 'View Products'],
            ['name' => 'products.edit',       'module' => 'products',     'display_name' => 'Edit Products'],
            ['name' => 'users.view',          'module' => 'users',        'display_name' => 'View Users'],
            ['name' => 'users.manage',        'module' => 'users',        'display_name' => 'Manage Users'],
            ['name' => 'audit.view',          'module' => 'audit',        'display_name' => 'View Audit Logs'],
            ['name' => 'ai.manage',           'module' => 'ai',           'display_name' => 'Manage AI Config'],
            ['name' => 'whatsapp.manage',     'module' => 'whatsapp',     'display_name' => 'Manage WhatsApp'],
            ['name' => 'integrations.manage', 'module' => 'integrations', 'display_name' => 'Manage Integrations'],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(
                ['name' => $p['name']],
                ['module' => $p['module'], 'display_name' => $p['display_name']]
            );
        }
    }
}
