<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lets an admin pin a Lark Base mapping to a specific existing Lead Source /
     * Lead Channel, instead of the sync always auto-creating a "Lark" source
     * and a channel named after the Base table (see
     * LarkBaseService::syncRecordToLeadWithResult()). Both are nullable: a
     * mapping without them keeps the old auto-generated behavior.
     */
    public function up(): void
    {
        Schema::table('lark_base_tables', function (Blueprint $table) {
            $table->string('default_source_type', 100)->nullable()->after('field_mapping');
            $table->foreignId('default_channel_type_id')->nullable()->after('default_source_type')
                ->constrained('lead_channel_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lark_base_tables', function (Blueprint $table) {
            $table->dropConstrainedForeignId('default_channel_type_id');
            $table->dropColumn('default_source_type');
        });
    }
};
