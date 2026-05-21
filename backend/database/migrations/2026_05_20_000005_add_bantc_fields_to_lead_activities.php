<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->text('budget')->nullable()->after('outcome');
            $table->text('authority')->nullable()->after('budget');
            $table->text('needs')->nullable()->after('authority');
            $table->text('timeline')->nullable()->after('needs');
            $table->text('competitor')->nullable()->after('timeline');
        });
    }

    public function down(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->dropColumn(['budget', 'authority', 'needs', 'timeline', 'competitor']);
        });
    }
};
