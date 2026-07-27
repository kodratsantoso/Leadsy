<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Service Categories
        $categories = [
            ['name' => 'NetSuite Implementation', 'description' => 'Full ERP implementation'],
            ['name' => 'Lark Enhancement', 'description' => 'Advanced Lark configuration and customization'],
            ['name' => 'Lark Base Application', 'description' => 'Custom Lark Base relational database app'],
            ['name' => 'Lark Approval Workflow', 'description' => 'Complex multi-stage approval processes'],
            ['name' => 'Lark Automation', 'description' => 'Automated workflows and triggers'],
            ['name' => 'AnyCross / API Integration', 'description' => 'System integrations and API development'],
            ['name' => 'Custom Application Development', 'description' => 'Bespoke software development'],
            ['name' => 'Data Migration', 'description' => 'ETL and data transfer services'],
            ['name' => 'Training and Enablement', 'description' => 'User and admin training sessions'],
            ['name' => 'Support / Retainer Service', 'description' => 'Ongoing technical and functional support'],
            ['name' => 'Consulting & Advisory', 'description' => 'Strategic business and IT consulting'],
        ];

        foreach ($categories as $cat) {
            DB::table('ps_service_categories')->updateOrInsert(['name' => $cat['name']], [
                'description' => $cat['description'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Complexity Levels
        $complexities = [
            ['name' => 'Simple', 'multiplier' => 1.00, 'description' => 'Standard requirements, no customization'],
            ['name' => 'Medium', 'multiplier' => 1.25, 'description' => 'Minor customizations and integrations'],
            ['name' => 'Complex', 'multiplier' => 1.50, 'description' => 'Significant customization, multiple systems'],
            ['name' => 'Enterprise', 'multiplier' => 2.00, 'description' => 'Highly bespoke, mission-critical, legacy migrations'],
        ];

        foreach ($complexities as $comp) {
            DB::table('ps_complexity_levels')->updateOrInsert(['name' => $comp['name']], [
                'multiplier' => $comp['multiplier'],
                'description' => $comp['description'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. PS Roles
        $roles = [
            ['name' => 'Project Manager', 'description' => 'Oversees project delivery and timeline'],
            ['name' => 'Solution Architect', 'description' => 'Designs the overall technical solution'],
            ['name' => 'Functional Consultant', 'description' => 'Configures system and maps business processes'],
            ['name' => 'Technical Consultant', 'description' => 'Develops customizations and scripts'],
            ['name' => 'QA Engineer', 'description' => 'Tests system functionality and integrations'],
            ['name' => 'Trainer', 'description' => 'Delivers user training'],
            ['name' => 'Support Specialist', 'description' => 'Provides post-go-live support'],
        ];

        foreach ($roles as $role) {
            DB::table('ps_roles')->updateOrInsert(['name' => $role['name']], [
                'description' => $role['description'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 4. Rate Cards (Defaults)
        $pmId = DB::table('ps_roles')->where('name', 'Project Manager')->value('id');
        $saId = DB::table('ps_roles')->where('name', 'Solution Architect')->value('id');
        $fcId = DB::table('ps_roles')->where('name', 'Functional Consultant')->value('id');
        $tcId = DB::table('ps_roles')->where('name', 'Technical Consultant')->value('id');
        $qaId = DB::table('ps_roles')->where('name', 'QA Engineer')->value('id');
        $trId = DB::table('ps_roles')->where('name', 'Trainer')->value('id');
        $supId = DB::table('ps_roles')->where('name', 'Support Specialist')->value('id');

        $rates = [
            ['role_id' => $pmId, 'rate_per_manday' => 800.00],
            ['role_id' => $saId, 'rate_per_manday' => 1000.00],
            ['role_id' => $fcId, 'rate_per_manday' => 700.00],
            ['role_id' => $tcId, 'rate_per_manday' => 750.00],
            ['role_id' => $qaId, 'rate_per_manday' => 500.00],
            ['role_id' => $trId, 'rate_per_manday' => 600.00],
            ['role_id' => $supId, 'rate_per_manday' => 450.00],
        ];

        foreach ($rates as $rate) {
            if ($rate['role_id']) {
                DB::table('ps_rate_cards')->updateOrInsert(
                    ['role_id' => $rate['role_id'], 'is_active' => true],
                    [
                        'rate_per_manday' => $rate['rate_per_manday'],
                        'effective_from' => '2024-01-01',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // 5. Complexity Dimensions
        $dimensions = [
            ['name' => 'Business Process', 'description' => 'Complexity of workflows and approvals'],
            ['name' => 'Data Migration', 'description' => 'Volume and cleanliness of legacy data'],
            ['name' => 'Integration', 'description' => 'Number and complexity of third-party systems'],
            ['name' => 'Customization', 'description' => 'Bespoke scripts and UI changes'],
            ['name' => 'Reporting', 'description' => 'Custom dashboards and reports'],
            ['name' => 'Change Management', 'description' => 'User readiness and adoption risk'],
            ['name' => 'Security & Compliance', 'description' => 'Regulatory and access requirements'],
            ['name' => 'Timeline', 'description' => 'Aggressiveness of the delivery schedule'],
            ['name' => 'Resource Availability', 'description' => 'Client SME availability'],
        ];

        foreach ($dimensions as $dim) {
            DB::table('ps_complexity_dimensions')->updateOrInsert(['name' => $dim['name']], [
                'description' => $dim['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 6. Permissions
        $permissions = [
            ['module' => 'professional_services', 'name' => 'professional_services.view', 'display_name' => 'View professional service estimations'],
            ['module' => 'professional_services', 'name' => 'professional_services.create', 'display_name' => 'Create estimations'],
            ['module' => 'professional_services', 'name' => 'professional_services.edit', 'display_name' => 'Edit estimations'],
            ['module' => 'professional_services', 'name' => 'professional_services.delete', 'display_name' => 'Delete estimations'],
            ['module' => 'professional_services', 'name' => 'professional_services.review', 'display_name' => 'Review estimations (PM)'],
            ['module' => 'professional_services', 'name' => 'professional_services.approve', 'display_name' => 'Approve estimations (Executive/Sales Dir)'],
            ['module' => 'professional_services', 'name' => 'professional_services.manage_templates', 'display_name' => 'Manage estimation templates'],
            ['module' => 'professional_services', 'name' => 'professional_services.manage_rates', 'display_name' => 'Manage PS rate cards and roles'],
            ['module' => 'professional_services', 'name' => 'professional_services.manage_complexity', 'display_name' => 'Manage complexity matrix'],
        ];

        foreach ($permissions as $perm) {
            DB::table('permissions')->updateOrInsert(['name' => $perm['name']], [
                'module' => $perm['module'],
                'display_name' => $perm['display_name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        // Give permissions to super_admin and sales_manager
        $superAdminRole = DB::table('roles')->where('name', 'super_admin')->first();
        if ($superAdminRole) {
            foreach ($permissions as $perm) {
                $permissionId = DB::table('permissions')->where('name', $perm['name'])->value('id');
                if ($permissionId) {
                    DB::table('role_permission')->updateOrInsert([
                        'role_id' => $superAdminRole->id,
                        'permission_id' => $permissionId,
                    ]);
                }
            }
        }

        $salesManagerRole = DB::table('roles')->where('name', 'sales_manager')->first();
        if ($salesManagerRole) {
            $managerPerms = ['professional_services.view', 'professional_services.create', 'professional_services.edit', 'professional_services.review'];
            foreach ($managerPerms as $permName) {
                $permissionId = DB::table('permissions')->where('name', $permName)->value('id');
                if ($permissionId) {
                    DB::table('role_permission')->updateOrInsert([
                        'role_id' => $salesManagerRole->id,
                        'permission_id' => $permissionId,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Don't remove permissions on rollback as it might break existing roles,
        // but we could clean up the PS specific tables.
        // Handled by the first migration's down() method.
    }
};
