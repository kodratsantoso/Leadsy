<?php

namespace Database\Seeders;

use App\Models\AiModel;
use App\Models\AiProvider;
use App\Models\ContactSource;
use App\Models\FunnelStage;
use App\Models\Industry;
use App\Models\IntegrationConfig;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\SubIndustry;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedPermissions();
        $this->seedRoles();
        $this->seedFunnelStages();
        $this->seedContactSources();
        $this->seedSuperAdmin();

        // ── Seeded Sample Data ──────────────────────────────────────────────────
        // The following are seeded reference/demo entries.
        // They come from the DATABASE — not from the frontend.
        // Clearly marked as "seeded sample data" per SSOT §5 strategy.
        // ───────────────────────────────────────────────────────────────────────
        $this->seedIndustries();
        $this->seedProducts();
        $this->seedAiProviders();
        $this->seedNotificationPreferences();
    }

    private function seedPermissions(): void
    {
        $perms = [
            ['name' => 'leads.view',            'module' => 'leads',         'display_name' => 'View Leads'],
            ['name' => 'leads.create',           'module' => 'leads',         'display_name' => 'Create Leads'],
            ['name' => 'leads.edit',             'module' => 'leads',         'display_name' => 'Edit Leads'],
            ['name' => 'leads.delete',           'module' => 'leads',         'display_name' => 'Delete Leads'],
            ['name' => 'leads.export',           'module' => 'leads',         'display_name' => 'Export Leads'],
            ['name' => 'leads.merge',            'module' => 'leads',         'display_name' => 'Approve Merge'],
            ['name' => 'products.view',          'module' => 'products',      'display_name' => 'View Products'],
            ['name' => 'products.edit',          'module' => 'products',      'display_name' => 'Edit Products'],
            ['name' => 'users.view',             'module' => 'users',         'display_name' => 'View Users'],
            ['name' => 'users.manage',           'module' => 'users',         'display_name' => 'Manage Users'],
            ['name' => 'audit.view',             'module' => 'audit',         'display_name' => 'View Audit Logs'],
            ['name' => 'ai.manage',              'module' => 'ai',            'display_name' => 'Manage AI Config'],
            ['name' => 'whatsapp.manage',        'module' => 'whatsapp',      'display_name' => 'Manage WhatsApp'],
            ['name' => 'integrations.manage',    'module' => 'integrations',  'display_name' => 'Manage Integrations'],
        ];

        foreach ($perms as $p) {
            Permission::firstOrCreate(['name' => $p['name']], $p);
        }
    }

    private function seedRoles(): void
    {
        $allPerms = Permission::pluck('id')->toArray();

        $roles = [
            ['name' => 'super_admin',   'display_name' => 'Super Admin',                'perms' => $allPerms],
            ['name' => 'admin',         'display_name' => 'Admin',                       'perms' => $allPerms],
            ['name' => 'sales_manager', 'display_name' => 'Sales Manager',               'perms' => Permission::whereIn('module', ['leads', 'products'])->pluck('id')->toArray()],
            ['name' => 'sales_exec',    'display_name' => 'Sales / BD Executive',        'perms' => Permission::whereIn('name', ['leads.view', 'leads.create', 'leads.edit', 'products.view'])->pluck('id')->toArray()],
            ['name' => 'presales',      'display_name' => 'Presales / Research Analyst', 'perms' => Permission::whereIn('name', ['leads.view', 'leads.create', 'products.view', 'products.edit', 'ai.manage'])->pluck('id')->toArray()],
            ['name' => 'viewer',        'display_name' => 'Viewer / Auditor',            'perms' => Permission::whereIn('name', ['leads.view', 'products.view', 'audit.view'])->pluck('id')->toArray()],
        ];

        foreach ($roles as $r) {
            $role = Role::firstOrCreate(
                ['name' => $r['name']],
                ['display_name' => $r['display_name']],
            );
            $role->permissions()->syncWithoutDetaching($r['perms']);
        }
    }

    private function seedFunnelStages(): void
    {
        $stages = [
            ['name' => 'New Lead',          'sequence' => 1,  'color' => '#6366f1', 'probability' => 5],
            ['name' => 'Enriched',          'sequence' => 2,  'color' => '#8b5cf6', 'probability' => 10],
            ['name' => 'Qualified',         'sequence' => 3,  'color' => '#a855f7', 'probability' => 20],
            ['name' => 'Contacted',         'sequence' => 4,  'color' => '#3b82f6', 'probability' => 30],
            ['name' => 'Follow Up Ongoing', 'sequence' => 5,  'color' => '#0ea5e9', 'probability' => 40],
            ['name' => 'Meeting Scheduled', 'sequence' => 6,  'color' => '#14b8a6', 'probability' => 50],
            ['name' => 'Opportunity',       'sequence' => 7,  'color' => '#22c55e', 'probability' => 60],
            ['name' => 'Proposal Sent',     'sequence' => 8,  'color' => '#84cc16', 'probability' => 75],
            ['name' => 'Won',               'sequence' => 9,  'color' => '#16a34a', 'probability' => 100],
            ['name' => 'Lost',              'sequence' => 10, 'color' => '#ef4444', 'probability' => 0],
            ['name' => 'Nurture / Hold',    'sequence' => 11, 'color' => '#f59e0b', 'probability' => 10],
        ];

        foreach ($stages as $s) {
            FunnelStage::firstOrCreate(['name' => $s['name']], $s);
        }
    }

    private function seedContactSources(): void
    {
        $sources = ['LinkedIn', 'Website', 'Google Maps', 'Public Directory', 'Manual Input', 'Referral', 'Other'];

        foreach ($sources as $name) {
            ContactSource::firstOrCreate(['name' => $name]);
        }
    }

    private function seedSuperAdmin(): void
    {
        $adminRole = Role::where('name', 'super_admin')->first();
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default-workspace'],
            ['name' => 'Default Workspace', 'status' => 'active']
        );

        User::firstOrCreate(
            ['email' => 'admin@prasetia.com'],
            [
                'name'     => 'Rizub',
                'password' => 'admin123!',
                'role_id'  => $adminRole?->id,
                'tenant_id' => $tenant->id,
            ],
        );
    }

    // ────────────────────────────────────────────────────────────────────────────
    // SEEDED SAMPLE DATA — Read from DB, NOT from frontend
    // All entries below are clearly labeled sample/demo data.
    // ────────────────────────────────────────────────────────────────────────────

    /**
     * Seed sample industries and sub-industries.
     * Source: seeded sample data (DB-backed, not frontend hardcoded)
     */
    private function seedIndustries(): void
    {
        $industries = [
            'Manufacturing' => [
                'Food & Beverage Manufacturing',
                'Textile & Apparel',
                'Chemical & Plastics',
                'Electronics & Components',
                'Heavy Equipment',
            ],
            'Retail & Distribution' => [
                'FMCG / Consumer Goods',
                'Wholesale Distribution',
                'E-commerce & Marketplace',
                'Specialty Retail',
            ],
            'Technology & IT Services' => [
                'Software Development',
                'IT Infrastructure',
                'Cybersecurity',
                'Cloud Services',
                'Data Analytics',
            ],
            'Finance & Banking' => [
                'Commercial Banking',
                'Insurance',
                'Investment & Asset Management',
                'Fintech',
            ],
            'Property & Construction' => [
                'Residential Development',
                'Commercial Real Estate',
                'Infrastructure & Civil',
                'Interior & Fit-Out',
            ],
            'Healthcare & Pharmaceuticals' => [
                'Hospital & Clinic',
                'Pharmaceutical Distribution',
                'Medical Devices',
                'Health Tech',
            ],
            'Logistics & Transportation' => [
                'Freight & Forwarding',
                'Last-Mile Delivery',
                'Warehousing & 3PL',
                'Fleet Management',
            ],
            'Education & Training' => [
                'K-12 Schools',
                'Higher Education',
                'Vocational Training',
                'EdTech',
            ],
            'Food & Beverage (F&B)' => [
                'Restaurant & Cafe',
                'Food Processing',
                'Catering & Events',
                'Franchise F&B',
            ],
            'Energy & Utilities' => [
                'Oil & Gas',
                'Renewable Energy',
                'Power Generation',
                'Water & Waste Management',
            ],
        ];

        foreach ($industries as $industryName => $subIndustries) {
            $industry = Industry::firstOrCreate(
                ['name' => $industryName],
                ['is_active' => true]
            );

            foreach ($subIndustries as $subName) {
                SubIndustry::firstOrCreate(
                    ['name' => $subName, 'industry_id' => $industry->id]
                );
            }
        }
    }

    /**
     * Seed sample products.
     * Source: seeded sample data (DB-backed, not frontend hardcoded)
     */
    private function seedProducts(): void
    {
        $tenantId = Tenant::query()->orderBy('id')->value('id');

        $products = [
            [
                'name'                 => 'Enterprise ERP Solution',
                'description'          => 'End-to-end enterprise resource planning system covering finance, HR, inventory, and supply chain.',
                'category'             => 'Enterprise Software',
                'target_industry'      => 'Manufacturing, Retail & Distribution',
                'target_buyer_persona' => 'CEO, CFO, Operations Director',
                'target_pain_points'   => 'Manual processes, siloed data, poor inventory visibility',
                'ideal_company_profile'=> 'Mid-to-large manufacturers and distributors with 100+ employees',
                'status'               => 'active',
            ],
            [
                'name'                 => 'Sales Intelligence Platform',
                'description'          => 'AI-powered lead scoring, territory management, and CRM integration. Helps sales teams prioritize high-value prospects.',
                'category'             => 'Sales Technology',
                'target_industry'      => 'Technology & IT Services, Finance & Banking',
                'target_buyer_persona' => 'Sales Director, VP Sales, Business Development Manager',
                'target_pain_points'   => 'Low conversion rates, poor lead visibility, territory conflicts',
                'ideal_company_profile'=> 'B2B companies with active outbound sales teams',
                'status'               => 'active',
            ],
            [
                'name'                 => 'Fleet Management System',
                'description'          => 'Real-time GPS tracking, route optimization, maintenance scheduling, and driver behavior monitoring.',
                'category'             => 'Logistics Technology',
                'target_industry'      => 'Logistics & Transportation',
                'target_buyer_persona' => 'Operations Manager, Fleet Manager, Logistics Director',
                'target_pain_points'   => 'High fuel costs, untracked vehicles, unplanned maintenance',
                'ideal_company_profile'=> 'Companies operating 10+ commercial vehicles',
                'status'               => 'active',
            ],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $product['name']],
                array_merge($product, ['tenant_id' => $tenantId])
            );
        }
    }

    /**
     * Seed AI provider records as inactive placeholders.
     * Source: seeded sample data — no live API keys, status = inactive.
     * Configure real keys in Settings → AI Defaults.
     */
    private function seedAiProviders(): void
    {
        $providers = [
            [
                'name'              => 'OpenAI',
                'slug'              => 'openai',
                'base_url'          => 'https://api.openai.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'gpt-4o',           'cost_tier' => 'high',   'context_window' => 128000, 'status' => 'active'],
                    ['name' => 'gpt-4o-mini',      'cost_tier' => 'low',    'context_window' => 128000, 'status' => 'active'],
                    ['name' => 'gpt-3.5-turbo',    'cost_tier' => 'low',    'context_window' => 16385,  'status' => 'active'],
                ],
            ],
            [
                'name'              => 'Anthropic',
                'slug'              => 'anthropic',
                'base_url'          => 'https://api.anthropic.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'claude-3-5-sonnet-20241022', 'cost_tier' => 'high',   'context_window' => 200000, 'status' => 'active'],
                    ['name' => 'claude-3-haiku-20240307',    'cost_tier' => 'low',    'context_window' => 200000, 'status' => 'active'],
                ],
            ],
            [
                'name'              => 'Google Gemini',
                'slug'              => 'google',
                'base_url'          => 'https://generativelanguage.googleapis.com/v1beta',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'gemini-1.5-pro',   'cost_tier' => 'high',   'context_window' => 1048576, 'status' => 'active'],
                    ['name' => 'gemini-1.5-flash',  'cost_tier' => 'low',    'context_window' => 1048576, 'status' => 'active'],
                ],
            ],
        ];

        foreach ($providers as $providerData) {
            $models = $providerData['models'];
            unset($providerData['models']);

            $provider = AiProvider::firstOrCreate(
                ['slug' => $providerData['slug']],
                $providerData
            );

            foreach ($models as $model) {
                AiModel::firstOrCreate(
                    ['ai_provider_id' => $provider->id, 'name' => $model['name']],
                    $model
                );
            }
        }
    }

    /**
     * Seed default notification preferences into integration_configs.
     * Source: seeded defaults — persisted to DB, toggled by user in Settings → Notifications.
     */
    private function seedNotificationPreferences(): void
    {
        $tenantId = Tenant::query()->orderBy('id')->value('id');

        $defaults = [
            ['key' => 'notify_inapp_enabled',    'value' => '1', 'category' => 'notifications', 'is_secret' => false, 'value_type' => 'boolean'],
            ['key' => 'notify_email_enabled',    'value' => '0', 'category' => 'notifications', 'is_secret' => false, 'value_type' => 'boolean'],
            ['key' => 'notify_whatsapp_enabled', 'value' => '0', 'category' => 'notifications', 'is_secret' => false, 'value_type' => 'boolean'],
        ];

        foreach ($defaults as $config) {
            IntegrationConfig::firstOrCreate(
                ['tenant_id' => $tenantId, 'key' => $config['key']],
                array_merge($config, ['tenant_id' => $tenantId])
            );
        }
    }
}
