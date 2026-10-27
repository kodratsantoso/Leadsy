<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Multi-Touch Sales Cadence Engine.
     */
    public function up(): void
    {
        if (!Schema::hasTable('sales_cadences')) {
            Schema::create('sales_cadences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('target_audience')->nullable();
                $table->string('trigger_type')->default('manual'); // 'manual', 'lead_created', 'stage_change'
                $table->json('trigger_criteria')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('sales_cadence_steps')) {
            Schema::create('sales_cadence_steps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sales_cadence_id')->constrained('sales_cadences')->cascadeOnDelete();
                $table->integer('step_number')->default(1);
                $table->integer('delay_days')->default(0);
                $table->string('channel')->default('whatsapp'); // 'whatsapp', 'email', 'call_reminder', 'internal_task'
                $table->string('template_subject')->nullable();
                $table->text('template_body');
                $table->boolean('ai_personalization')->default(true);
                $table->boolean('is_automated')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('lead_cadence_enrollments')) {
            Schema::create('lead_cadence_enrollments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->foreignId('sales_cadence_id')->constrained('sales_cadences')->cascadeOnDelete();
                $table->unsignedBigInteger('lead_id')->index();
                $table->unsignedBigInteger('enrolled_by')->nullable();
                $table->unsignedBigInteger('current_step_id')->nullable();
                $table->integer('current_step_number')->default(1);
                $table->string('status')->default('active'); // 'active', 'paused', 'completed', 'unsubscribed'
                $table->timestamp('next_execution_at')->nullable()->index();
                $table->timestamp('enrolled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'status']);
            });
        }

        if (!Schema::hasTable('cadence_step_logs')) {
            Schema::create('cadence_step_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_cadence_enrollment_id')->constrained('lead_cadence_enrollments')->cascadeOnDelete();
                $table->unsignedBigInteger('sales_cadence_step_id')->nullable()->index();
                $table->unsignedBigInteger('lead_id')->index();
                $table->string('channel');
                $table->string('status')->default('pending'); // 'pending', 'executed', 'skipped', 'failed', 'replied'
                $table->text('rendered_content')->nullable();
                $table->text('execution_error')->nullable();
                $table->timestamp('executed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cadence_step_logs');
        Schema::dropIfExists('lead_cadence_enrollments');
        Schema::dropIfExists('sales_cadence_steps');
        Schema::dropIfExists('sales_cadences');
    }
};
