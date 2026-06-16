<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('name');
            $table->decimal('price', 15, 2)->default(0.00);
            $table->string('pricing_type')->default('flat_rate'); // flat_rate, per_user, usage_based
            $table->string('billing_period')->default('monthly'); // monthly, yearly, one_time, custom
            $table->integer('subscription_duration_value')->default(1);
            $table->string('subscription_duration_unit')->default('month'); // day, month, year, lifetime
            $table->json('features')->nullable(); // array of string features
            $table->string('status')->default('active'); // active, inactive
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_tiers');
    }
};
