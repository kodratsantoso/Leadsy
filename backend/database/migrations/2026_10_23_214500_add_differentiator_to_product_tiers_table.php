<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_tiers') && !Schema::hasColumn('product_tiers', 'differentiator')) {
            Schema::table('product_tiers', function (Blueprint $table) {
                $table->text('differentiator')->nullable()->after('features');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('product_tiers') && Schema::hasColumn('product_tiers', 'differentiator')) {
            Schema::table('product_tiers', function (Blueprint $table) {
                $table->dropColumn('differentiator');
            });
        }
    }
};
