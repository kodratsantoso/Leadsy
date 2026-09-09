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
        Schema::create('customer_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->foreignId('contact_id')->nullable()->constrained('lead_contacts')->onDelete('set null');
            $table->foreignId('sales_order_id')->nullable()->constrained('lead_sales_orders')->onDelete('set null');
            $table->string('survey_type')->default('nps')->comment('nps, csat, onboarding_review, qbr_feedback');
            $table->integer('score')->comment('0-10 for NPS, 1-5 for CSAT');
            $table->string('category')->comment('promoter, passive, detractor for NPS; satisfied, neutral, dissatisfied for CSAT');
            $table->text('feedback_text')->nullable();
            $table->string('sentiment')->default('neutral')->comment('positive, neutral, negative');
            $table->boolean('action_required')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['lead_id', 'survey_type']);
            $table->index(['category', 'action_required']);
        });

        Schema::create('customer_renewal_opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
            $table->foreignId('sales_order_id')->constrained('lead_sales_orders')->onDelete('cascade');
            $table->string('opportunity_type')->default('renewal')->comment('renewal, upsell, cross_sell');
            $table->date('current_contract_end');
            $table->string('urgency')->default('normal')->comment('normal, high, critical');
            $table->integer('days_until_expiration')->default(0);
            $table->foreignId('recommended_product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->decimal('estimated_value', 15, 2)->default(0);
            $table->text('reasoning')->nullable();
            $table->json('pitch_talking_points')->nullable();
            $table->string('status')->default('identified')->comment('identified, in_discussion, quoted, closed_won, closed_lost');
            $table->timestamps();

            $table->index(['lead_id', 'opportunity_type']);
            $table->index(['urgency', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_renewal_opportunities');
        Schema::dropIfExists('customer_feedbacks');
    }
};
