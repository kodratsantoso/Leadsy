<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_contacts', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->cascadeOnDelete();
            $table->dropUnique('whatsapp_contacts_phone_number_unique');
            $table->unique(['phone_number', 'user_id']);
        });

        Schema::table('whatsapp_conversations', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->cascadeOnDelete();
            $table->dropUnique('whatsapp_conversations_external_chat_id_unique');
            $table->unique(['external_chat_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_conversations', function (Blueprint $table) {
            $table->dropUnique(['external_chat_id', 'user_id']);
            $table->unique('external_chat_id');
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::table('whatsapp_contacts', function (Blueprint $table) {
            $table->dropUnique(['phone_number', 'user_id']);
            $table->unique('phone_number');
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
