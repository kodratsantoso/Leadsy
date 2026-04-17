<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BRD §5.2 – Audit Log
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');                 // created, updated, deleted, login, export …
            $table->string('module');                  // leads, products, users, ai, whatsapp …
            $table->string('record_type')->nullable(); // App\Models\Lead …
            $table->unsignedBigInteger('record_id')->nullable();
            $table->json('before_value')->nullable();
            $table->json('after_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['module', 'created_at']);
            $table->index(['record_type', 'record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
