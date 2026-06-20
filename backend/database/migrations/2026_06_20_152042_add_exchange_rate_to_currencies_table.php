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
            $table->decimal('idr_exchange_rate', 15, 4)->nullable()->after('is_active');
            $table->timestamp('exchange_rate_updated_at')->nullable()->after('idr_exchange_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            $table->dropColumn(['idr_exchange_rate', 'exchange_rate_updated_at']);
        });
    }
};
