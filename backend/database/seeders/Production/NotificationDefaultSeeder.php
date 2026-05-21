<?php

namespace Database\Seeders\Production;

use App\Models\IntegrationConfig;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class NotificationDefaultSeeder extends Seeder
{
    public function run(): void
    {
        $tenantId = Tenant::query()->orderBy('id')->value('id');

        if (! $tenantId) {
            return; // AdminUserSeeder must run first to create the tenant
        }

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
