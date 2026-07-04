<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('idx_company_caches', function (Blueprint $table) {
            $table->id();
            $table->string('idx_code')->unique();
            $table->string('company_name');
            $table->string('industry')->nullable();
            $table->string('sub_industry')->nullable();
            $table->string('sector')->nullable();
            $table->string('listing_board')->nullable();
            $table->string('website')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->json('raw_payload_json')->nullable();
            $table->timestamp('last_fetched_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('idx_company_caches');
    }
};
