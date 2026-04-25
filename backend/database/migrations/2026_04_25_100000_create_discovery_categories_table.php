<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_categories', function (Blueprint $table) {
            $table->id();
            $table->string('label');                 // Display label, e.g. "Restaurant / F&B"
            $table->string('value');                 // Google Places type string, e.g. "restaurant"
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('value');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_categories');
    }
};
