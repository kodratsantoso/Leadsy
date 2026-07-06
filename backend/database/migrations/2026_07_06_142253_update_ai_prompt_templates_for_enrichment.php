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
        Schema::table('ai_prompt_template_versions', function (Blueprint $table) {
            $table->longText('content')->nullable()->change();
            $table->longText('system_prompt')->nullable()->after('content');
            $table->longText('user_prompt')->nullable()->after('system_prompt');
            $table->json('output_contract_json')->nullable()->after('user_prompt');
            $table->json('variables_schema_json')->nullable()->after('output_contract_json');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_prompt_template_versions', function (Blueprint $table) {
            $table->dropColumn([
                'system_prompt',
                'user_prompt',
                'output_contract_json',
                'variables_schema_json'
            ]);
        });
    }
};
