<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Role;
use App\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        $allPermIds = Schema::hasTable('permissions') 
            ? Permission::pluck('id')->toArray()
            : [];

        $role = Role::updateOrCreate(
            ['name' => 'executive'],
            ['display_name' => 'Executive / C-Level']
        );
        
        if (!empty($allPermIds)) {
            $role->permissions()->syncWithoutDetaching($allPermIds);
        }
    }

    public function down(): void
    {
        Role::where('name', 'executive')->delete();
    }
};
