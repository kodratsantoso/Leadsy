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
        if (!Schema::hasTable('document_number_sequences')) {
            Schema::create('document_number_sequences', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->string('document_type', 50)->index(); // quotation, sales_order, invoice, bast, sow
                $table->string('prefix', 30);
                $table->string('format', 100)->default('{PREFIX}-{YYYY}{MM}-{COUNTER}');
                $table->unsignedInteger('counter_digits')->default(4);
                $table->unsignedBigInteger('current_counter')->default(0);
                $table->string('reset_frequency', 20)->default('monthly'); // monthly, yearly, never
                $table->date('last_reset_date')->nullable();
                $table->string('description', 255)->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();

                // Unique per tenant and document type
                $table->unique(['tenant_id', 'document_type'], 'tenant_doc_type_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_number_sequences');
    }
};
