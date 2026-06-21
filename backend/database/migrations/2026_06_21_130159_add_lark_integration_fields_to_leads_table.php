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
            $table->string('lark_base_id')->nullable()->after('external_id')->comment('Source Base ID from Lark');
            $table->string('lark_table_id')->nullable()->after('lark_base_id')->comment('Source Table ID from Lark');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['lark_base_id', 'lark_table_id']);
        });
    }
};
