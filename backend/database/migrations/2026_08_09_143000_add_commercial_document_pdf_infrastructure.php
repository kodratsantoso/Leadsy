<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend tenants table with company branding & signatory fields
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('legal_name', 255)->nullable()->after('name');
            $table->string('brand_name', 255)->nullable()->after('legal_name');
            $table->string('logo_path', 500)->nullable()->after('brand_name');
            $table->text('address')->nullable()->after('logo_path');
            $table->string('tax_number', 100)->nullable()->after('address');
            $table->string('signatory_name', 255)->nullable()->after('tax_number');
            $table->string('signatory_position', 255)->nullable()->after('signatory_name');
            $table->string('signatory_image_path', 500)->nullable()->after('signatory_position');
        });

        // 2. Create company_bank_accounts table
        Schema::create('company_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('bank_name', 255);
            $table->string('account_number', 100);
            $table->string('account_name', 255);
            $table->string('currency', 10)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Extend products table with document branding fields
        Schema::table('products', function (Blueprint $table) {
            $table->string('logo_path', 500)->nullable()->after('website_url');
            $table->text('default_terms_conditions')->nullable()->after('logo_path');
            $table->text('quotation_terms_conditions')->nullable()->after('default_terms_conditions');
            $table->text('sales_order_terms_conditions')->nullable()->after('quotation_terms_conditions');
        });

        // 4. Add bank_account_id to lead_quotations
        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->foreignId('bank_account_id')->nullable()->after('workflow_state_id')
                ->constrained('company_bank_accounts')->nullOnDelete();
        });

        // 5. Add bank_account_id to lead_sales_orders
        Schema::table('lead_sales_orders', function (Blueprint $table) {
            $table->foreignId('bank_account_id')->nullable()->after('cancelled_at')
                ->constrained('company_bank_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lead_sales_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bank_account_id');
        });

        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bank_account_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['logo_path', 'default_terms_conditions', 'quotation_terms_conditions', 'sales_order_terms_conditions']);
        });

        Schema::dropIfExists('company_bank_accounts');

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['legal_name', 'brand_name', 'logo_path', 'address', 'tax_number', 'signatory_name', 'signatory_position', 'signatory_image_path']);
        });
    }
};
