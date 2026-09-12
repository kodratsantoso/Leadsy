<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Freezes the USD -> tenant-currency conversion at the moment each AI
     * activity runs. Without this, a historical cost report would silently
     * change every time it's viewed as today's exchange rate drifts —
     * these columns make the recorded cost immutable, matching what the
     * activity actually cost in the admin's currency at that point in time.
     */
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->string('cost_currency_code', 3)->nullable()->after('estimated_cost_usd');
            $table->decimal('cost_converted', 14, 6)->nullable()->after('cost_currency_code');
            $table->decimal('exchange_rate_snapshot', 18, 8)->nullable()->after('cost_converted');
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->dropColumn(['cost_currency_code', 'cost_converted', 'exchange_rate_snapshot']);
        });
    }
};
