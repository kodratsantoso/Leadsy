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
        Schema::table('whatsapp_conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('assignee_id')->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            
            $table->foreign('assignee_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_conversations', function (Blueprint $table) {
            $table->dropForeign(['assignee_id']);
            $table->dropColumn(['assignee_id', 'is_resolved', 'notes', 'tags']);
        });
    }
};
