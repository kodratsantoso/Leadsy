<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_contact_payloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained('lead_contacts')->cascadeOnDelete();
            $table->string('source_type'); // e.g. LUSHA
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_contact_payloads');
    }
};
