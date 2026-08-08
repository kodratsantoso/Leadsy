<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('lark_integrations')) {
            Schema::table('lark_integrations', function (Blueprint $table) {
                if (!Schema::hasColumn('lark_integrations', 'meeting_summary_mapping')) {
                    $table->json('meeting_summary_mapping')->default('{}')->after('enabled_modules');
                }
            });
        }

        if (Schema::hasTable('leads')) {
            Schema::table('leads', function (Blueprint $table) {
                if (!Schema::hasColumn('leads', 'lark_folder_token')) {
                    $table->string('lark_folder_token')->nullable()->after('external_id');
                }
            });
        }

        if (Schema::hasTable('lead_transcripts')) {
            Schema::table('lead_transcripts', function (Blueprint $table) {
                if (!Schema::hasColumn('lead_transcripts', 'lark_doc_url')) {
                    $table->string('lark_doc_url')->nullable()->after('recorded_at');
                }
                if (!Schema::hasColumn('lead_transcripts', 'lark_doc_id')) {
                    $table->string('lark_doc_id')->nullable()->after('lark_doc_url');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lark_integrations')) {
            Schema::table('lark_integrations', function (Blueprint $table) {
                if (Schema::hasColumn('lark_integrations', 'meeting_summary_mapping')) {
                    $table->dropColumn('meeting_summary_mapping');
                }
            });
        }

        if (Schema::hasTable('leads')) {
            Schema::table('leads', function (Blueprint $table) {
                if (Schema::hasColumn('leads', 'lark_folder_token')) {
                    $table->dropColumn('lark_folder_token');
                }
            });
        }

        if (Schema::hasTable('lead_transcripts')) {
            Schema::table('lead_transcripts', function (Blueprint $table) {
                if (Schema::hasColumn('lead_transcripts', 'lark_doc_url')) {
                    $table->dropColumn('lark_doc_url');
                }
                if (Schema::hasColumn('lead_transcripts', 'lark_doc_id')) {
                    $table->dropColumn('lark_doc_id');
                }
            });
        }
    }
};
