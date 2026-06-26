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
        Schema::create('product_scrape_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('source_url');
            $table->string('status')->default('pending'); // pending | running | success | failed
            $table->longText('raw_html_text')->nullable();
            $table->longText('cleaned_text')->nullable();
            $table->json('scrape_summary_json')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('scraped_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        Schema::create('product_specification_comparisons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('scrape_run_id')->nullable();
            $table->json('previous_snapshot_json')->nullable();
            $table->json('latest_snapshot_json')->nullable();
            $table->json('comparison_result_json')->nullable();
            $table->json('update_recommendation_json')->nullable();
            $table->integer('confidence_score')->nullable();
            $table->string('status')->default('draft'); // draft | reviewed | approved | rejected
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('scrape_run_id')->references('id')->on('product_scrape_runs')->onDelete('cascade');
        });

        Schema::create('product_update_suggestions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('comparison_id');
            $table->string('field_name');
            $table->text('current_value')->nullable();
            $table->text('suggested_value')->nullable();
            $table->string('change_type'); // added | updated | removed | unchanged
            $table->text('reason')->nullable();
            $table->string('status')->default('pending'); // pending | approved | rejected | applied
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('comparison_id')->references('id')->on('product_specification_comparisons')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_update_suggestions');
        Schema::dropIfExists('product_specification_comparisons');
        Schema::dropIfExists('product_scrape_runs');
    }
};
