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
        Schema::create('kpi_targets', function (Blueprint $table) {
            $table->id();
            $table->string('target_name')->nullable();
            $table->string('role_type'); // sales, presales, csm, account_manager
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('direct_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('kpi_type'); 
            $table->string('period_type'); // weekly, monthly, quarterly, yearly
            $table->date('start_date');
            $table->date('end_date');
            $table->string('target_value_type'); // quantity, percentage, score, days, hours
            $table->integer('target_quantity')->nullable();
            $table->decimal('target_percentage', 5, 2)->nullable();
            $table->decimal('target_score', 8, 2)->nullable();
            $table->integer('target_days')->nullable();
            $table->decimal('target_hours', 8, 2)->nullable();
            $table->decimal('actual_value', 15, 2)->nullable();
            $table->decimal('achievement_percentage', 8, 2)->nullable();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('industry_id')->nullable()->constrained('industries')->nullOnDelete();
            $table->foreignId('business_category_id')->nullable()->constrained('business_categories')->nullOnDelete();
            $table->decimal('weight', 5, 2)->default(100);
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_targets');
    }
};
