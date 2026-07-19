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
        foreach (['lead_quotation_items', 'lead_sales_order_items'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->integer('duration_value')->nullable();
                $table->string('duration_unit')->nullable(); // day, month, year
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['lead_quotation_items', 'lead_sales_order_items'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn(['duration_value', 'duration_unit']);
            });
        }
    }
};
