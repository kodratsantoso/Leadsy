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
        Schema::create('digital_signature_envelopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('ps_documents')->onDelete('cascade');
            $table->string('provider_name');
            $table->string('provider_envelope_id');
            $table->string('provider_document_id')->nullable();
            $table->string('status');
            $table->json('request_payload_json')->nullable();
            $table->json('response_payload_json')->nullable();
            $table->json('last_status_payload_json')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_signature_envelopes');
    }
};
