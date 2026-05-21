<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const SAMPLE_PRODUCT_NAMES = [
        'Enterprise ERP Solution',
        'Sales Intelligence Platform',
        'Fleet Management System',
    ];

    public function up(): void
    {
        Product::query()
            ->whereIn('name', self::SAMPLE_PRODUCT_NAMES)
            ->delete();
    }

    public function down(): void
    {
        // Intentionally empty. Product catalog rows are user-managed data and
        // should not be recreated by rollback.
    }
};
