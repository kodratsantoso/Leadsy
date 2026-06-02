<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Role;
use App\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        // Safe check in case Permission table is not loaded yet or in fresh migration contexts
        $execIds = Schema::hasTable('permissions') 
            ? Permission::whereIn('name', ['leads.view', 'leads.create', 'leads.edit', 'products.view'])->pluck('id')->toArray()
            : [];

        $roles = [
            ['name' => 'account_manager', 'display_name' => 'Account Manager', 'perms' => $execIds],
            ['name' => 'csm', 'display_name' => 'Customer Success Management', 'perms' => $execIds],
        ];

        foreach ($roles as $r) {
            $role = Role::updateOrCreate(
                ['name' => $r['name']],
                ['display_name' => $r['display_name']]
            );
            if (!empty($r['perms'])) {
                $role->permissions()->syncWithoutDetaching($r['perms']);
            }
        }
    }

    public function down(): void
    {
        Role::whereIn('name', ['account_manager', 'csm'])->delete();
    }
};
