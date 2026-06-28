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
        Schema::create('lark_base_field_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('connection_id')->constrained('lark_base_connections')->cascadeOnDelete();
            $table->string('leadsy_entity_type')->default('lead');
            $table->string('leadsy_field_key');
            $table->string('leadsy_field_label')->nullable();
            $table->string('lark_field_id');
            $table->string('lark_field_name')->nullable();
            $table->string('lark_field_type')->nullable();
            $table->string('sync_direction')->default('leadsy_to_lark');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lark_base_field_mappings');
    }
};
