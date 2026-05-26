<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sales_visits')) {
            Schema::create('sales_visits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('status', 40)->default('in_progress');
                $table->timestamp('clock_in_at')->nullable();
                $table->timestamp('clock_out_at')->nullable();
                $table->decimal('clock_in_lat', 10, 7)->nullable();
                $table->decimal('clock_in_lng', 10, 7)->nullable();
                $table->decimal('clock_out_lat', 10, 7)->nullable();
                $table->decimal('clock_out_lng', 10, 7)->nullable();
                $table->unsignedInteger('clock_in_accuracy_m')->nullable();
                $table->unsignedInteger('clock_out_accuracy_m')->nullable();
                $table->unsignedInteger('clock_in_distance_m')->nullable();
                $table->unsignedInteger('clock_out_distance_m')->nullable();
                $table->string('risk_status', 40)->default('verified');
                $table->json('risk_signals')->nullable();
                $table->json('device_metadata')->nullable();
                $table->string('visit_result', 80)->nullable();
                $table->text('notes')->nullable();
                $table->string('client_name')->nullable();
                $table->string('client_title')->nullable();
                $table->timestamp('signature_captured_at')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'status']);
                $table->index(['user_id', 'clock_in_at']);
                $table->index(['risk_status', 'created_at']);
            });
        }

        if (! Schema::hasTable('sales_visit_media')) {
            Schema::create('sales_visit_media', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sales_visit_id')->constrained('sales_visits')->cascadeOnDelete();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('media_type', 40);
                $table->string('disk')->default('public');
                $table->string('path');
                $table->string('mime_type')->nullable();
                $table->unsignedBigInteger('size_bytes')->nullable();
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
                $table->unsignedInteger('accuracy_m')->nullable();
                $table->timestamp('captured_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['sales_visit_id', 'media_type']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_visit_media');
        Schema::dropIfExists('sales_visits');
    }
};
