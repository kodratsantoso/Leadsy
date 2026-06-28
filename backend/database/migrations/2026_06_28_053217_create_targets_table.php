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
        Schema::create('targets', function (Blueprint $table) {
            $table->id();
            $table->string('target_name')->nullable();
            $table->string('role_type');
            $table->string('target_type');
            $table->foreignId('assigned_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('direct_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('period_type')->default('monthly'); // weekly, monthly, quarterly, yearly
            $table->date('start_date');
            $table->date('end_date');
            $table->string('target_value_type'); // amount, quantity, percentage, score, days
            $table->decimal('target_amount', 15, 2)->nullable();
            $table->integer('target_quantity')->nullable();
            $table->decimal('target_percentage', 5, 2)->nullable();
            $table->decimal('target_score', 8, 2)->nullable();
            $table->integer('target_days')->nullable();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('industry_id')->nullable()->constrained('industries')->nullOnDelete();
            $table->foreignId('business_category_id')->nullable()->constrained('business_categories')->nullOnDelete();
            $table->string('revenue_type')->nullable(); // new_business, renewal, expansion
            $table->decimal('weight', 5, 2)->default(100);
            $table->foreignId('parent_target_id')->nullable()->constrained('targets')->nullOnDelete();
            $table->string('cascade_level')->nullable(); // company, department, manager, user
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->timestamps();
        });

        // Migrate existing users' targets to the targets table
        $users = DB::table('users')
            ->whereNotNull('target_revenue')
            ->where('target_revenue', '>', 0)
            ->get();

        foreach ($users as $user) {
            $periodType = $user->target_period ?? 'monthly';
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
            
            if ($periodType === 'quarterly') {
                $startDate = now()->startOfQuarter();
                $endDate = now()->endOfQuarter();
            } elseif ($periodType === 'yearly') {
                $startDate = now()->startOfYear();
                $endDate = now()->endOfYear();
            }

            DB::table('targets')->insert([
                'target_name' => 'Legacy Revenue Target - ' . $user->name,
                'role_type' => 'sales',
                'target_type' => 'closed_won_revenue',
                'assigned_user_id' => $user->id,
                'direct_manager_id' => $user->direct_manager_id,
                'period_type' => $periodType,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'target_value_type' => 'amount',
                'target_amount' => $user->target_calculation_type === 'amount' ? $user->target_revenue : null,
                'target_percentage' => $user->target_calculation_type === 'percentage' ? $user->target_percentage : null,
                'revenue_type' => 'new_business',
                'weight' => 100,
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
        Schema::dropIfExists('targets');
    }
};
