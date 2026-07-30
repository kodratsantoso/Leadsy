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
        Schema::table('ps_estimations', function (Blueprint $table) {
            $table->unsignedBigInteger('converted_quotation_id')->nullable()->after('status');
            $table->timestamp('converted_at')->nullable()->after('converted_quotation_id');
            $table->unsignedBigInteger('converted_by')->nullable()->after('converted_at');

            $table->foreign('converted_quotation_id')->references('id')->on('lead_quotations')->nullOnDelete();
            $table->foreign('converted_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::table('lead_quotations', function (Blueprint $table) {
            $table->string('source_type')->nullable()->after('approved_by');
            $table->unsignedBigInteger('source_reference_id')->nullable()->after('source_type');
        });

        Schema::table('lead_quotation_items', function (Blueprint $table) {
            $table->string('source_type')->nullable()->after('product_tier_id');
            $table->unsignedBigInteger('source_reference_id')->nullable()->after('source_type');
            $table->unsignedBigInteger('professional_service_estimation_id')->nullable()->after('source_reference_id');
            $table->unsignedBigInteger('professional_service_estimation_line_id')->nullable()->after('professional_service_estimation_id');

            $table->foreign('professional_service_estimation_id', 'fk_lqi_pse')->references('id')->on('ps_estimations')->nullOnDelete();
            $table->foreign('professional_service_estimation_line_id', 'fk_lqi_psel')->references('id')->on('ps_estimation_lines')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ps_estimations_and_quotations', function (Blueprint $table) {
            //
        });
    }
};
