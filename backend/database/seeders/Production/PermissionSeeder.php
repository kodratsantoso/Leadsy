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
            ['name' => 'leads.ai_profiling',  'module' => 'leads',        'display_name' => 'AI Lead Profiling'],

            ['name' => 'products.view',       'module' => 'products',     'display_name' => 'View Products'],
            ['name' => 'products.edit',       'module' => 'products',     'display_name' => 'Edit Products'],

            ['name' => 'users.view',          'module' => 'users',        'display_name' => 'View Users'],
            ['name' => 'users.manage',        'module' => 'users',        'display_name' => 'Manage Users & Roles'],

            ['name' => 'audit.view',          'module' => 'audit',        'display_name' => 'View Audit Logs'],

            ['name' => 'ai.manage',           'module' => 'ai',           'display_name' => 'Manage AI Configuration'],
            ['name' => 'ai_testing.manage',   'module' => 'ai',           'display_name' => 'AI Testing & Screening Monitor'],

            ['name' => 'whatsapp.manage',     'module' => 'whatsapp',     'display_name' => 'Manage WhatsApp Hub'],
            ['name' => 'whatsapp.personal',   'module' => 'whatsapp',     'display_name' => 'Use Personal WhatsApp'],
            ['name' => 'whatsapp.qontak',     'module' => 'whatsapp',     'display_name' => 'Use Mekari Qontak'],

            ['name' => 'integrations.manage', 'module' => 'integrations', 'display_name' => 'Manage Integrations & Settings'],

            ['name' => 'maps.view',           'module' => 'maps',         'display_name' => 'View Maps & Territory'],

            ['name' => 'professional_services.view',              'module' => 'professional_services', 'display_name' => 'View PS Estimations & Projects'],
            ['name' => 'professional_services.create',            'module' => 'professional_services', 'display_name' => 'Create PS Estimations'],
            ['name' => 'professional_services.edit',              'module' => 'professional_services', 'display_name' => 'Edit PS Estimations & Worklogs'],
            ['name' => 'professional_services.delete',            'module' => 'professional_services', 'display_name' => 'Delete PS Estimations'],
            ['name' => 'professional_services.review',            'module' => 'professional_services', 'display_name' => 'Review Estimations (PM)'],
            ['name' => 'professional_services.approve',           'module' => 'professional_services', 'display_name' => 'Approve Estimations (Executive)'],
            ['name' => 'professional_services.manage_templates',  'module' => 'professional_services', 'display_name' => 'Manage PS Templates'],
            ['name' => 'professional_services.manage_rates',      'module' => 'professional_services', 'display_name' => 'Manage PS Rate Cards'],
            ['name' => 'professional_services.manage_complexity', 'module' => 'professional_services', 'display_name' => 'Manage PS Complexity Matrix'],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(
                ['name' => $p['name']],
                ['module' => $p['module'], 'display_name' => $p['display_name']]
            );
        }
    }
}
