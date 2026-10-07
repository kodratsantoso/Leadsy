<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_screening_runs', function (Blueprint $table) {
            $table->id();
            // nullOnDelete, not cascade: a run record documenting "this lead
            // failed screening with error X" stays useful evidence even if
            // the lead itself is later deleted.
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            // Snapshot company_name at run time — survives the lead being
            // deleted or renamed, so the history stays readable.
            $table->string('company_name')->nullable();
            $table->string('status'); // success | failed
            $table->text('error_message')->nullable();
            $table->json('stages_executed')->nullable();
            $table->unsignedSmallInteger('lead_score')->nullable();
            $table->string('qualification_status')->nullable();
            // Which mechanism triggered this run — lets the monitor UI show
            // whether the scheduled background process or a manual action
            // produced a given result.
            $table->string('triggered_by')->default('scheduler'); // scheduler | manual_button | manual_command
            $table->decimal('elapsed_seconds', 8, 2)->nullable();
            $table->timestamps();

            $table->index(['created_at']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_screening_runs');
    }
};
