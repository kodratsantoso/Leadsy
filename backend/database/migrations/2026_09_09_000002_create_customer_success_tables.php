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
        Schema::create('customer_health_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->integer('overall_score')->default(100)->comment('Score from 0 to 100');
            $table->string('health_status')->default('healthy')->comment('thriving, healthy, at_risk, critical');
            $table->integer('activity_score')->default(100);
            $table->integer('onboarding_score')->default(100);
            $table->integer('sentiment_score')->default(100);
            $table->integer('relationship_score')->default(100);
            $table->json('factors_json')->nullable()->comment('Detailed metrics breakdown, penalties, and boosts');
            $table->text('summary')->nullable();
            $table->string('trend')->default('stable')->comment('improving, stable, declining');
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->index(['lead_id', 'health_status']);
            $table->index('overall_score');
        });

        Schema::create('customer_onboarding_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->foreignId('sales_order_id')->nullable()->constrained('lead_sales_orders')->onDelete('set null');
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('sequence')->default(1);
            $table->date('target_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('status')->default('pending')->comment('pending, in_progress, completed, delayed, blocked');
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->json('deliverables')->nullable()->comment('List of actionable checklist items');
            $table->timestamps();

            $table->index(['lead_id', 'sequence']);
            $table->index(['lead_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_onboarding_milestones');
        Schema::dropIfExists('customer_health_scores');
    }
};
