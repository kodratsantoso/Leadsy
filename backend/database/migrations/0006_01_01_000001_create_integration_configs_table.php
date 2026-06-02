<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_configs', function (Blueprint $table) {
            $table->id();
            $table->string('category')->index(); // 'maps', 'whatsapp', 'general'
            $table->string('key');
            $table->text('value_encrypted')->nullable(); // Stored encrypted
            $table->string('value_type')->default('string'); // 'string', 'boolean', 'json'
            $table->boolean('is_secret')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_configs');
    }
};
