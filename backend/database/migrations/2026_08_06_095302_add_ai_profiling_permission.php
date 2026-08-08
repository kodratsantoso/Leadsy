<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $permissionId = DB::table('permissions')->insertGetId([
            'name' => 'leads.ai_profiling',
            'module' => 'leads',
            'display_name' => 'AI Lead Profiling',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Assign to super_admin, admin, sales, sales_manager, and other roles
        $roles = DB::table('roles')->whereIn('name', ['super_admin', 'admin', 'sales_manager', 'sales', 'executive'])->get();
        foreach ($roles as $role) {
            DB::table('role_permission')->insertOrIgnore([
                'role_id' => $role->id,
                'permission_id' => $permissionId,
            ]);
        }
    }

    public function down(): void
    {
        $permission = DB::table('permissions')->where('name', 'leads.ai_profiling')->first();
        if ($permission) {
            DB::table('role_permission')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
