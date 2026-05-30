<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds parent_lead_id to support subsidiary / group-company relationships.
 * A lead can be marked as a subsidiary of another lead in the same database.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('parent_lead_id')
                ->nullable()
                ->after('duplicate_of_id')
                ->constrained('leads')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['parent_lead_id']);
            $table->dropColumn('parent_lead_id');
        });
    }
};
