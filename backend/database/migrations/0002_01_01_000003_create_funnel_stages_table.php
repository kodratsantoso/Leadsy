<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BRD §4.3 – Master Funnel Stage
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('funnel_stages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedSmallInteger('sequence')->default(0);
            $table->string('color', 7)->default('#6366f1');
            $table->unsignedSmallInteger('probability')->default(0); // 0-100
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funnel_stages');
    }
};
