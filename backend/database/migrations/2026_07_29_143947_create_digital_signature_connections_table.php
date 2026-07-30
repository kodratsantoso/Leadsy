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
        Schema::create('digital_signature_connections', function (Blueprint $table) {
            $table->id();
            $table->string('provider_name'); // e.g. documenso
            $table->string('base_url');
            $table->text('encrypted_api_key');
            $table->text('encrypted_webhook_secret')->nullable();
            $table->integer('default_expiry_days')->default(7);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_signature_connections');
    }
};
