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
        Schema::table('leads', function (Blueprint $table) {
            $table->text('budget')->nullable();
            $table->text('authority')->nullable();
            $table->text('needs')->nullable();
            $table->text('timeline')->nullable();
            $table->text('competitor')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['budget', 'authority', 'needs', 'timeline', 'competitor']);
        });
    }
};
