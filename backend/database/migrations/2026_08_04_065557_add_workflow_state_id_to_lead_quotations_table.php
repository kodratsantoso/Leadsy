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
        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->foreignId('workflow_state_id')->nullable()->constrained('workflow_states')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->dropForeign(['workflow_state_id']);
            $table->dropColumn('workflow_state_id');
        });
    }
};
