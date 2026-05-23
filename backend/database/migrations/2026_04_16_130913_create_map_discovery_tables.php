<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Map Search History
        Schema::create('map_search_history', function (Blueprint $table) {
            $table->id();
            $table->string('area_name');
            $table->string('area_place_id')->nullable();
            $table->decimal('area_lat', 10, 7)->nullable();
            $table->decimal('area_lng', 10, 7)->nullable();
            $table->string('keyword')->nullable();
            $table->string('category')->nullable();
            $table->string('search_mode')->default('nearby'); // nearby, text
            $table->unsignedInteger('radius_meters')->nullable();
            $table->unsignedInteger('result_count')->default(0);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Map Candidates (Cache)
        Schema::create('map_candidates', function (Blueprint $table) {
            $table->string('place_id')->primary();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone', 50)->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('category')->nullable();
            $table->decimal('rating', 3, 1)->nullable();
            $table->text('maps_url')->nullable();

            $table->json('raw_payload')->nullable();
            $table->timestamp('fetched_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_candidates');
        Schema::dropIfExists('map_search_history');
    }
};
