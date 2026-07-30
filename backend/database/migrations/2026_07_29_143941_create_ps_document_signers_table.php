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
        Schema::create('ps_document_signers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('ps_documents')->onDelete('cascade');
            $table->string('signer_type'); // customer, internal
            $table->string('signer_name');
            $table->string('signer_email');
            $table->string('signer_title')->nullable();
            $table->string('signer_company')->nullable();
            $table->integer('signing_order')->default(1);
            $table->string('status')->default('pending'); // pending, sent, viewed, signed, declined
            $table->timestamp('signed_at')->nullable();
            $table->string('provider_signer_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ps_document_signers');
    }
};
