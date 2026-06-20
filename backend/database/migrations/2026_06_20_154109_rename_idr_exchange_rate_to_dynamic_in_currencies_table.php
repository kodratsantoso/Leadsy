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
        Schema::table('currencies', function (Blueprint $table) {
            $table->renameColumn('idr_exchange_rate', 'exchange_rate');
        });
        
        Schema::table('currencies', function (Blueprint $table) {
            $table->string('base_currency', 3)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            $table->dropColumn('base_currency');
        });
        
        Schema::table('currencies', function (Blueprint $table) {
            $table->renameColumn('exchange_rate', 'idr_exchange_rate');
        });
    }
};
