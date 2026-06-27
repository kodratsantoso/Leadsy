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
        Schema::create('lead_quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('quotation_number')->unique();
            $table->string('quotation_type', 50)->default('new'); // new, renewal, expansion
            $table->string('quotation_status', 50)->default('draft')->index(); // draft, sent, revised, accepted, rejected, expired, cancelled
            $table->date('quotation_date');
            $table->date('valid_until')->nullable();
            
            $table->string('customer_name')->nullable();
            $table->string('billing_entity')->nullable();
            
            $table->string('currency', 3)->default('IDR');
            $table->decimal('subtotal_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            
            $table->text('notes')->nullable();
            $table->text('terms_conditions')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            
            $table->timestamps();
        });

        Schema::create('lead_quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('lead_quotations')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('billing_period', 50)->default('one_time'); // one_time, monthly, quarterly, yearly
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
        });

        Schema::create('lead_sales_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('quotation_id')->nullable()->constrained('lead_quotations')->nullOnDelete();
            $table->foreignId('parent_sales_order_id')->nullable()->constrained('lead_sales_orders')->nullOnDelete();
            
            $table->string('sales_order_number')->unique();
            $table->string('order_type', 50)->default('new'); // new, renewal, expansion
            $table->string('order_status', 50)->default('draft')->index(); // draft, confirmed, active, completed, cancelled
            $table->date('order_date');
            
            $table->string('customer_name')->nullable();
            $table->string('billing_entity')->nullable();
            
            $table->string('currency', 3)->default('IDR');
            $table->decimal('subtotal_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('recurring_amount', 15, 2)->nullable();
            
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->date('renewal_date')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            
            $table->timestamps();
        });

        Schema::create('lead_sales_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained('lead_sales_orders')->cascadeOnDelete();
            $table->foreignId('quotation_item_id')->nullable()->constrained('lead_quotation_items')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->string('billing_period', 50)->default('one_time');
            
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_sales_order_items');
        Schema::dropIfExists('lead_sales_orders');
        Schema::dropIfExists('lead_quotation_items');
        Schema::dropIfExists('lead_quotations');
    }
};
