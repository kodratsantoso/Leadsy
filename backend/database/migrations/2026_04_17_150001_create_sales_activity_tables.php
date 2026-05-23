<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MODULE B: Sales Activity & Lead Evaluation Engine

        // 1. Lead Activities (Timeline)
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('activity_type'); // Call, WhatsApp, Meeting, Email, Follow-up, Note, Internal Review, Stage Change
            $table->text('description')->nullable();
            $table->timestamp('activity_date');

            // Polymorphic to tie to a specifi meeting or note if needed
            $table->nullableMorphs('related_entity');

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. Lead Meetings
        Schema::create('lead_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->timestamp('meeting_date');
            $table->string('meeting_type')->nullable(); // Virtual, In-Person
            $table->json('participants')->nullable();
            $table->text('summary')->nullable();
            $table->json('key_points')->nullable();
            $table->json('objections')->nullable();
            $table->json('next_steps')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Lead Transcripts
        Schema::create('lead_transcripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('source_type'); // whatsapp, meeting, manual
            $table->unsignedBigInteger('source_id')->nullable();
            $table->text('transcript_text');
            $table->timestamp('recorded_at')->useCurrent();
            $table->enum('evaluation_status', ['pending', 'evaluated', 'skipped'])->default('pending');
            $table->timestamps();
        });

        // 4. Lead AI Evaluations (for meetings or transcripts)
        Schema::create('lead_ai_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();

            // Polymorphic to point to transcripts or meetings
            $table->morphs('source');

            $table->string('sentiment')->nullable(); // positive, neutral, negative
            $table->string('intent_level')->nullable(); // high, medium, low
            $table->string('interest_level')->nullable(); // high, medium, low
            $table->json('objections_detected')->nullable();
            $table->json('buying_signals')->nullable();
            $table->text('next_best_action')->nullable();
            $table->foreignId('recommended_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->unsignedSmallInteger('confidence_score')->nullable();
            $table->timestamp('evaluated_at')->useCurrent();
            $table->timestamps();
        });

        // 5. Lead Follow Ups
        Schema::create('lead_follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->timestamp('due_date');
            $table->enum('status', ['pending', 'completed', 'overdue', 'cancelled'])->default('pending');
            $table->string('purpose')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_follow_ups');
        Schema::dropIfExists('lead_ai_evaluations');
        Schema::dropIfExists('lead_transcripts');
        Schema::dropIfExists('lead_meetings');
        Schema::dropIfExists('lead_activities');
    }
};
