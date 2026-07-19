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
        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->foreignId('contact_id')->nullable()->constrained('lead_contacts')->nullOnDelete();
            $table->foreignId('sales_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('presales_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('payment_terms')->nullable();
            $table->string('billing_frequency')->nullable();
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->date('expected_close_date')->nullable();
            $table->integer('probability')->nullable();
            $table->string('forecast_type')->nullable();
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
            $table->string('approval_status')->default('not_required');
            $table->string('pdf_url')->nullable();
            $table->foreignId('converted_sales_order_id')->nullable()->constrained('lead_sales_orders')->nullOnDelete();
        });
 
        Schema::table('lead_quotation_items', function (Blueprint $table) {
            $table->string('unit')->nullable();
            $table->string('line_discount_type')->nullable(); // amount, percentage
            $table->decimal('line_discount_value', 15, 2)->nullable();
            $table->decimal('line_discount_amount', 15, 2)->default(0);
            $table->string('tax_code')->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->integer('sort_order')->default(0);
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_quotation_items', function (Blueprint $table) {
            $table->dropColumn([
                'unit',
                'line_discount_type',
                'line_discount_value',
                'line_discount_amount',
                'tax_code',
                'tax_rate',
                'sort_order'
            ]);
        });
 
        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->dropForeign(['contact_id']);
            $table->dropForeign(['sales_owner_id']);
            $table->dropForeign(['presales_owner_id']);
            $table->dropForeign(['converted_sales_order_id']);
            $table->dropColumn([
                'contact_id',
                'sales_owner_id',
                'presales_owner_id',
                'payment_terms',
                'billing_frequency',
                'contract_start_date',
                'contract_end_date',
                'expected_close_date',
                'probability',
                'forecast_type',
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
                'approval_status',
                'pdf_url',
                'converted_sales_order_id'
            ]);
        });
    }
};
