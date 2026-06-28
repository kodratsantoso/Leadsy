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
        Schema::create('revenue_targets', function (Blueprint $table) {
            $table->id();
            $table->string('target_name')->nullable();
            $table->string('owner_type'); // company, department, manager, user
            $table->string('role_type')->nullable(); // sales, account_manager
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('direct_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('revenue_target_type'); // new_business, renewal, expansion, etc.
            $table->string('period_type'); // yearly, quarterly, monthly
            $table->integer('year');
            $table->integer('quarter')->nullable();
            $table->integer('month')->nullable();
            $table->string('currency_code', 3)->default('IDR');
            $table->string('currency_symbol', 10)->default('Rp');
            $table->decimal('target_amount', 20, 2);
            $table->decimal('actual_amount', 20, 2)->nullable();
            $table->decimal('achievement_percentage', 8, 2)->nullable();
            $table->string('allocation_method')->nullable(); // amount, percentage
            $table->foreignId('parent_target_id')->nullable()->constrained('revenue_targets')->nullOnDelete();
            $table->decimal('allocated_amount', 20, 2)->nullable();
            $table->decimal('allocation_percentage', 5, 2)->nullable();
            $table->decimal('remaining_amount_snapshot', 20, 2)->nullable();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('industry_id')->nullable()->constrained('industries')->nullOnDelete();
            $table->foreignId('business_category_id')->nullable()->constrained('business_categories')->nullOnDelete();
            $table->string('status')->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->timestamps();
        });

        // Migrate existing users' targets to the revenue_targets table
        $users = \Illuminate\Support\Facades\DB::table('users')
            ->whereNotNull('target_revenue')
            ->where('target_revenue', '>', 0)
            ->get();

        foreach ($users as $user) {
            $periodType = $user->target_period ?? 'monthly';
            $year = now()->year;
            $quarter = now()->quarter;
            $month = now()->month;

            \Illuminate\Support\Facades\DB::table('revenue_targets')->insert([
                'target_name' => 'Legacy Revenue Target - ' . $user->name,
                'owner_type' => 'user',
                'role_type' => 'sales',
                'revenue_target_type' => 'new_business',
                'assigned_user_id' => $user->id,
                'direct_manager_id' => $user->direct_manager_id,
                'period_type' => $periodType,
                'year' => $year,
                'quarter' => $periodType === 'quarterly' ? $quarter : null,
                'month' => $periodType === 'monthly' ? $month : null,
                'currency_code' => 'IDR',
                'currency_symbol' => 'Rp',
                'target_amount' => $user->target_calculation_type === 'amount' ? $user->target_revenue : 0,
                'allocation_method' => null,
                'status' => 'active',
                'tenant_id' => $user->tenant_id,
                'created_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('revenue_targets');
    }
};
