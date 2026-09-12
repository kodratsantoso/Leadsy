<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            // Null = no timeout enforced. This is the default so enabling this
            // feature never locks anyone out until an admin opts in explicitly.
            $table->unsignedInteger('session_timeout_minutes')->nullable();
            $table->unsignedTinyInteger('password_min_length')->default(8);
            $table->boolean('password_require_uppercase')->default(false);
            $table->boolean('password_require_special')->default(false);
            $table->timestamps();

            $table->unique('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_settings');
    }
};
