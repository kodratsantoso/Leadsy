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
        if (!Schema::hasTable('commercial_invoices')) {
            Schema::create('commercial_invoices', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number', 50)->unique();
                $table->unsignedBigInteger('lead_id');
                $table->unsignedBigInteger('quotation_id')->nullable();
                $table->unsignedBigInteger('sales_order_id')->nullable();
                $table->unsignedBigInteger('ps_document_id')->nullable();
                $table->string('milestone_name', 150)->default('Pelunasan Termin');
                $table->decimal('milestone_percentage', 5, 2)->default(100.00);
                $table->decimal('subtotal', 15, 2)->default(0);
                $table->decimal('tax_percentage', 5, 2)->default(11.00);
                $table->decimal('tax_amount', 15, 2)->default(0);
                $table->decimal('withholding_tax_percentage', 5, 2)->default(0.00);
                $table->decimal('withholding_tax_amount', 15, 2)->default(0);
                $table->decimal('total_amount', 15, 2)->default(0);
                $table->string('currency', 10)->default('IDR');
                $table->string('status', 30)->default('draft'); // draft, sent, paid, partially_paid, overdue, cancelled
                $table->date('invoice_date');
                $table->date('due_date');
                $table->string('payment_terms', 50)->default('Net 30');
                $table->text('bank_details')->nullable();
                $table->text('notes')->nullable();
                $table->string('pdf_path')->nullable();
                $table->decimal('paid_amount', 15, 2)->default(0);
                $table->timestamp('paid_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('tenant_id')->nullable();
                $table->timestamps();

                $table->index(['lead_id', 'status']);
                $table->index('ps_document_id');
                $table->index('tenant_id');
            });
        }

        if (!Schema::hasTable('commercial_invoice_items')) {
            Schema::create('commercial_invoice_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('commercial_invoice_id');
                $table->string('item_description', 255);
                $table->decimal('quantity', 10, 2)->default(1);
                $table->string('unit', 50)->default('Paket');
                $table->decimal('unit_price', 15, 2)->default(0);
                $table->decimal('amount', 15, 2)->default(0);
                $table->timestamps();

                $table->foreign('commercial_invoice_id')
                    ->references('id')
                    ->on('commercial_invoices')
                    ->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_invoice_items');
        Schema::dropIfExists('commercial_invoices');
    }
};
