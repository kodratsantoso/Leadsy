<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->decimal('estimated_closing_amount', 15, 2)->nullable()->after('lead_score');
            $table->decimal('realized_closing_amount', 15, 2)->nullable()->after('estimated_closing_amount');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['estimated_closing_amount', 'realized_closing_amount']);
        });
    }
};
