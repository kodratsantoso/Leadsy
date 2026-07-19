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
        // 1. Tax Codes
        Schema::create('tax_codes', function (Blueprint $table) {
            $table->id();
            $table->string('tax_code')->unique();
            $table->string('tax_name');
            $table->string('tax_type')->default('vat'); // sales_tax, vat, service_tax, non_taxable, other
            $table->decimal('rate_percentage', 5, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->string('country')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_until')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
 
        // 2. Withholding Tax Codes
        Schema::create('withholding_tax_codes', function (Blueprint $table) {
            $table->id();
            $table->string('wht_code')->unique();
            $table->string('wht_name');
            $table->string('wht_type')->default('income_tax'); // income_tax, service_withholding, professional_service, other
            $table->decimal('rate_percentage', 5, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->string('country')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_until')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
 
        // 3. Item Settings
        Schema::create('item_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique();
            $table->json('setting_value_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
 
        // 4. Extend lead_quotations and lead_sales_orders
        foreach (['lead_quotations', 'lead_sales_orders'] as $tbl) {
            Schema::table($tbl, function (Blueprint $table) {
                $table->decimal('total_withholding_tax', 15, 2)->default(0.00);
                $table->decimal('grand_total_before_wht', 15, 2)->default(0.00);
            });
        }
 
        // 5. Extend lead_quotation_items
        Schema::table('lead_quotation_items', function (Blueprint $table) {
            $table->foreignId('product_tier_id')->nullable()->constrained('product_tiers')->nullOnDelete();
            $table->string('pricing_model')->nullable(); // per_user, flat_rate, usage_based, etc.
            $table->string('price_source')->nullable(); // product_tier, product_base_price, manual
            $table->foreignId('tax_code_id')->nullable()->constrained('tax_codes')->nullOnDelete();
            $table->foreignId('withholding_tax_code_id')->nullable()->constrained('withholding_tax_codes')->nullOnDelete();
            $table->decimal('withholding_tax_rate', 5, 2)->default(0.00);
            $table->decimal('withholding_tax_amount', 15, 2)->default(0.00);
            $table->decimal('line_total_before_wht', 15, 2)->default(0.00);
            $table->decimal('line_total_after_wht', 15, 2)->default(0.00);
        });
 
        // 6. Extend lead_sales_order_items
        Schema::table('lead_sales_order_items', function (Blueprint $table) {
            $table->foreignId('product_tier_id')->nullable()->constrained('product_tiers')->nullOnDelete();
            $table->string('pricing_model')->nullable();
            $table->string('billing_cycle')->nullable();
            $table->string('price_source')->nullable();
            $table->foreignId('tax_code_id')->nullable()->constrained('tax_codes')->nullOnDelete();
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->foreignId('withholding_tax_code_id')->nullable()->constrained('withholding_tax_codes')->nullOnDelete();
            $table->decimal('withholding_tax_rate', 5, 2)->default(0.00);
            $table->decimal('withholding_tax_amount', 15, 2)->default(0.00);
            $table->decimal('line_total_before_wht', 15, 2)->default(0.00);
            $table->decimal('line_total_after_wht', 15, 2)->default(0.00);
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_sales_order_items', function (Blueprint $table) {
            $table->dropForeign(['product_tier_id']);
            $table->dropForeign(['tax_code_id']);
            $table->dropForeign(['withholding_tax_code_id']);
            $table->dropColumn([
                'product_tier_id', 'pricing_model', 'billing_cycle', 'price_source',
                'tax_code_id', 'tax_rate', 'withholding_tax_code_id', 'withholding_tax_rate',
                'withholding_tax_amount', 'line_total_before_wht', 'line_total_after_wht'
            ]);
        });
 
        Schema::table('lead_quotation_items', function (Blueprint $table) {
            $table->dropForeign(['product_tier_id']);
            $table->dropForeign(['tax_code_id']);
            $table->dropForeign(['withholding_tax_code_id']);
            $table->dropColumn([
                'product_tier_id', 'pricing_model', 'price_source',
                'tax_code_id', 'withholding_tax_code_id', 'withholding_tax_rate',
                'withholding_tax_amount', 'line_total_before_wht', 'line_total_after_wht'
            ]);
        });
 
        foreach (['lead_quotations', 'lead_sales_orders'] as $tbl) {
            Schema::table($tbl, function (Blueprint $table) {
                $table->dropColumn(['total_withholding_tax', 'grand_total_before_wht']);
            });
        }
 
        Schema::dropIfExists('item_settings');
        Schema::dropIfExists('withholding_tax_codes');
        Schema::dropIfExists('tax_codes');
    }
};
