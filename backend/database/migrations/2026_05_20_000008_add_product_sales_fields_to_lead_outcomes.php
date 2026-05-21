<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_outcomes', function (Blueprint $table) {
            $table->foreignId('product_id')
                ->nullable()
                ->after('lead_id')
                ->constrained('products')
                ->nullOnDelete();
            $table->string('sale_type')->default('new_sales')->after('outcome');
        });
    }

    public function down(): void
    {
        Schema::table('lead_outcomes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn('sale_type');
        });
    }
};
