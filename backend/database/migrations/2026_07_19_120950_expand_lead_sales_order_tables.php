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
        Schema::table('lead_sales_orders', function (Blueprint $table) {
            $table->foreignId('contact_id')->nullable()->constrained('lead_contacts')->nullOnDelete();
            $table->foreignId('sales_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('presales_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('account_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source_type')->default('direct');
            $table->string('spk_number')->nullable();
            $table->string('customer_po_number')->nullable();
            $table->string('lead_source')->nullable();
            $table->string('channel')->nullable();
            $table->date('expected_fulfillment_date')->nullable();
            $table->date('sales_effective_date')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('billing_frequency')->nullable();
            $table->boolean('tax_included')->default(false);
            $table->string('header_discount_type')->nullable(); // amount, percentage
            $table->decimal('header_discount_value', 15, 2)->nullable();
            $table->decimal('header_discount_amount', 15, 2)->default(0);
            $table->decimal('total_line_discount', 15, 2)->default(0);
            $table->decimal('other_cost', 15, 2)->default(0);
            $table->text('scope_of_work')->nullable();
            $table->text('exclusions')->nullable();
            $table->text('delivery_timeline')->nullable();
            $table->text('warranty_support_terms')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->string('department')->nullable();
            $table->string('cost_center')->nullable();
            $table->string('location')->nullable();
            $table->string('industry')->nullable();
            $table->string('business_category')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
        });

        Schema::table('lead_sales_order_items', function (Blueprint $table) {
            $table->string('unit')->nullable();
            $table->string('line_discount_type')->nullable(); // amount, percentage
            $table->decimal('line_discount_value', 15, 2)->nullable();
            $table->decimal('line_discount_amount', 15, 2)->default(0);
            $table->string('tax_code')->nullable();
            $table->integer('sort_order')->default(0);
            $table->date('service_start_date')->nullable();
            $table->date('service_end_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_sales_order_items', function (Blueprint $table) {
            $table->dropColumn([
                'unit',
                'line_discount_type',
                'line_discount_value',
                'line_discount_amount',
                'tax_code',
                'sort_order',
                'service_start_date',
                'service_end_date'
            ]);
        });

        Schema::table('lead_sales_orders', function (Blueprint $table) {
            $table->dropForeign(['contact_id']);
            $table->dropForeign(['sales_owner_id']);
            $table->dropForeign(['presales_owner_id']);
            $table->dropForeign(['account_manager_id']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn([
                'contact_id',
                'sales_owner_id',
                'presales_owner_id',
                'account_manager_id',
                'source_type',
                'spk_number',
                'customer_po_number',
                'lead_source',
                'channel',
                'expected_fulfillment_date',
                'sales_effective_date',
                'payment_terms',
                'billing_frequency',
                'tax_included',
                'header_discount_type',
                'header_discount_value',
                'header_discount_amount',
                'total_line_discount',
                'other_cost',
                'scope_of_work',
                'exclusions',
                'delivery_timeline',
                'warranty_support_terms',
                'customer_notes',
                'internal_notes',
                'terms_conditions',
                'department',
                'cost_center',
                'location',
                'industry',
                'business_category',
                'updated_by',
                'fulfilled_at',
                'closed_at',
                'cancelled_at'
            ]);
        });
    }
};
