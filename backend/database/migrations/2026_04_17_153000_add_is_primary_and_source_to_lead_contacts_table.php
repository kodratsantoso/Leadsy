<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->boolean('is_primary')->default(false)->after('do_not_contact');
            $table->string('source')->default('other')->after('is_primary'); // LUSHA, manual, website
            $table->unsignedTinyInteger('confidence_score')->default(50)->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('lead_contacts', function (Blueprint $table) {
            $table->dropColumn(['is_primary', 'source', 'confidence_score']);
        });
    }
};
