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
        Schema::create('ps_documents', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->unique();
            $table->foreignId('estimation_id')->constrained('ps_estimations')->onDelete('cascade');
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('cascade');
            $table->foreignId('quotation_id')->nullable()->constrained('lead_quotations')->nullOnDelete();
            $table->string('document_type'); // estimation, sow, scope_agreement
            $table->string('document_title');
            $table->integer('version_number')->default(1);
            $table->string('status')->default('draft_generated'); // draft_generated, sent_for_signature, signed, declined, expired, cancelled, archived, regenerated
            $table->string('template_key')->nullable();
            $table->string('template_version')->nullable();
            
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_url')->nullable();
            $table->string('file_mime_type')->default('application/pdf');
            $table->integer('file_size')->nullable();
            $table->string('storage_disk')->default('public');
            
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('sent_for_signature_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ps_documents');
    }
};
