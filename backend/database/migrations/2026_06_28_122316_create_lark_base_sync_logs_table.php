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
        Schema::create('lark_base_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('connection_id')->constrained('lark_base_connections')->cascadeOnDelete();
            $table->string('leadsy_entity_type')->nullable();
            $table->string('leadsy_entity_id')->nullable();
            $table->string('lark_record_id')->nullable();
            $table->string('sync_direction')->nullable();
            $table->string('sync_action')->nullable();
            $table->json('payload_json')->nullable();
            $table->json('response_json')->nullable();
            $table->string('status')->default('pending');
            $table->text('error_message')->nullable();
            $table->string('triggered_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lark_base_sync_logs');
    }
};
