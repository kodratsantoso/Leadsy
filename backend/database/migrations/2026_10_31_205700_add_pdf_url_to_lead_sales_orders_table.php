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
        if (Schema::hasTable('lead_sales_orders') && !Schema::hasColumn('lead_sales_orders', 'pdf_url')) {
            Schema::table('lead_sales_orders', function (Blueprint $table) {
                $table->string('pdf_url')->nullable()->after('terms_conditions');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lead_sales_orders') && Schema::hasColumn('lead_sales_orders', 'pdf_url')) {
            Schema::table('lead_sales_orders', function (Blueprint $table) {
                $table->dropColumn('pdf_url');
            });
        }
    }
};
