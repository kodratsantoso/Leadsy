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
        Schema::create('lead_commission_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('lead_sales_orders')->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role_type', 50); // sales, presales, csm, account_manager
            
            $table->decimal('contribution_percentage', 5, 2)->default(100.00);
            $table->decimal('revenue_basis', 15, 2)->default(0);
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->decimal('calculated_commission_amount', 15, 2)->nullable();
            
            $table->string('commission_status', 50)->default('draft')->index(); // draft, calculated, approved, paid, cancelled
            
            $table->json('calculation_snapshot_json')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_commission_allocations');
    }
};
