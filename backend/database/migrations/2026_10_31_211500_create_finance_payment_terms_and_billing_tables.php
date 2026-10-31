<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Payment Terms Master Setup
        if (!Schema::hasTable('payment_terms')) {
            Schema::create('payment_terms', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('code', 50)->unique();
                $table->enum('term_type', ['calendar', 'milestone'])->default('calendar'); // calendar (time/date) vs milestone (BAST/progress)
                $table->integer('days_due')->default(30); // Net X days
                $table->string('frequency', 50)->default('one_time'); // one_time, monthly, quarterly, custom_milestone
                $table->text('description')->nullable();
                $table->json('installments_config')->nullable(); // [{"label":"DP 50%","percentage":50,"trigger":"order_date","days_after":0},{"label":"Pelunasan BAST 50%","percentage":50,"trigger":"bast_signed","days_after":14}]
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->timestamps();
            });

            // Seed standard Indonesian enterprise & SaaS presets
            DB::table('payment_terms')->insert([
                [
                    'name' => 'Net 30 Days (Standard)',
                    'code' => 'NET_30',
                    'term_type' => 'calendar',
                    'days_due' => 30,
                    'frequency' => 'one_time',
                    'description' => 'Pembayaran penuh 30 hari kalender setelah faktur diterbitkan.',
                    'installments_config' => json_encode([
                        ['label' => 'Full Payment (100%)', 'percentage' => 100, 'trigger' => 'calendar_date', 'days_after' => 30]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Net 14 Days',
                    'code' => 'NET_14',
                    'term_type' => 'calendar',
                    'days_due' => 14,
                    'frequency' => 'one_time',
                    'description' => 'Pembayaran penuh 14 hari kalender setelah faktur diterbitkan.',
                    'installments_config' => json_encode([
                        ['label' => 'Full Payment (100%)', 'percentage' => 100, 'trigger' => 'calendar_date', 'days_after' => 14]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'CBD (Cash Before Delivery / 100% Upfront)',
                    'code' => 'CBD',
                    'term_type' => 'calendar',
                    'days_due' => 0,
                    'frequency' => 'one_time',
                    'description' => 'Pembayaran lunas 100% di muka sebelum layanan atau pengiriman dimulai.',
                    'installments_config' => json_encode([
                        ['label' => 'Upfront 100%', 'percentage' => 100, 'trigger' => 'calendar_date', 'days_after' => 0]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Monthly Recurring in Advance (SaaS)',
                    'code' => 'MONTHLY_ADVANCE',
                    'term_type' => 'calendar',
                    'days_due' => 7,
                    'frequency' => 'monthly',
                    'description' => 'Tagihan berulang setiap bulan di awal periode pemakaian (Net 7).',
                    'installments_config' => json_encode([
                        ['label' => 'Langganan Bulanan', 'percentage' => 100, 'trigger' => 'calendar_date', 'days_after' => 7]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Termin 50% DP / 50% Pelunasan BAST',
                    'code' => 'TERMIN_50_50',
                    'term_type' => 'milestone',
                    'days_due' => 14,
                    'frequency' => 'custom_milestone',
                    'description' => '50% Uang Muka (DP) saat kontrak/SO disepakati, 50% Pelunasan setelah penandatanganan BAST pekerjaan.',
                    'installments_config' => json_encode([
                        ['label' => 'Termin 1 (DP 50%)', 'percentage' => 50, 'trigger' => 'calendar_date', 'days_after' => 7],
                        ['label' => 'Termin 2 (Pelunasan BAST 50%)', 'percentage' => 50, 'trigger' => 'bast_milestone', 'days_after' => 14]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'name' => 'Termin 30% DP / 40% BAST SOW / 30% UAT Handover',
                    'code' => 'TERMIN_30_40_30',
                    'term_type' => 'milestone',
                    'days_due' => 14,
                    'frequency' => 'custom_milestone',
                    'description' => '30% DP, 40% Progress Milestone BAST, 30% Pelunasan UAT dan Handover project.',
                    'installments_config' => json_encode([
                        ['label' => 'Termin 1 - DP (30%)', 'percentage' => 30, 'trigger' => 'calendar_date', 'days_after' => 7],
                        ['label' => 'Termin 2 - Progress Milestone (40%)', 'percentage' => 40, 'trigger' => 'bast_milestone', 'days_after' => 14],
                        ['label' => 'Termin 3 - Pelunasan UAT (30%)', 'percentage' => 30, 'trigger' => 'bast_milestone', 'days_after' => 14]
                    ]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            ]);
        }

        // 2. Add payment terms and scheduling fields to lead_quotations if missing
        if (Schema::hasTable('lead_quotations')) {
            Schema::table('lead_quotations', function (Blueprint $table) {
                if (!Schema::hasColumn('lead_quotations', 'payment_term_id')) {
                    $table->unsignedBigInteger('payment_term_id')->nullable()->after('payment_terms');
                }
                if (!Schema::hasColumn('lead_quotations', 'payment_term_type')) {
                    $table->string('payment_term_type', 50)->default('calendar')->after('payment_term_id');
                }
                if (!Schema::hasColumn('lead_quotations', 'first_invoice_date')) {
                    $table->date('first_invoice_date')->nullable()->after('payment_term_type');
                }
                if (!Schema::hasColumn('lead_quotations', 'billing_schedules_json')) {
                    $table->json('billing_schedules_json')->nullable()->after('first_invoice_date');
                }
            });
        }

        // 3. Add payment terms and scheduling fields to lead_sales_orders if missing
        if (Schema::hasTable('lead_sales_orders')) {
            Schema::table('lead_sales_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('lead_sales_orders', 'payment_term_id')) {
                    $table->unsignedBigInteger('payment_term_id')->nullable()->after('payment_terms');
                }
                if (!Schema::hasColumn('lead_sales_orders', 'payment_term_type')) {
                    $table->string('payment_term_type', 50)->default('calendar')->after('payment_term_id');
                }
                if (!Schema::hasColumn('lead_sales_orders', 'first_invoice_date')) {
                    $table->date('first_invoice_date')->nullable()->after('payment_term_type');
                }
                if (!Schema::hasColumn('lead_sales_orders', 'billing_schedules_json')) {
                    $table->json('billing_schedules_json')->nullable()->after('first_invoice_date');
                }
            });
        }

        // 4. Sales Order Billing Schedules (Jadwal Termin Penagihan Otomatis)
        if (!Schema::hasTable('sales_order_billing_schedules')) {
            Schema::create('sales_order_billing_schedules', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('sales_order_id')->index();
                $table->integer('term_number')->default(1);
                $table->string('term_name', 150); // e.g. "Termin 1 - DP 50%", "Langganan Bulan 1"
                $table->enum('trigger_type', ['calendar_date', 'bast_milestone'])->default('calendar_date');
                $table->date('scheduled_date')->nullable(); // Tanggal trigger otomatis terbit invoice
                $table->date('due_date')->nullable(); // Tanggal jatuh tempo invoice
                $table->decimal('percentage', 5, 2)->default(100.00);
                $table->decimal('amount', 15, 2)->default(0.00); // Subtotal porsi termin
                $table->decimal('tax_amount', 15, 2)->default(0.00); // PPN 11%
                $table->decimal('withholding_tax_amount', 15, 2)->default(0.00); // PPh 23
                $table->decimal('total_amount', 15, 2)->default(0.00);
                $table->enum('status', ['pending', 'generated', 'cancelled'])->default('pending')->index();
                $table->unsignedBigInteger('commercial_invoice_id')->nullable()->index();
                $table->unsignedBigInteger('ps_document_id')->nullable()->index();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->timestamps();

                $table->foreign('sales_order_id')
                    ->references('id')
                    ->on('lead_sales_orders')
                    ->onDelete('cascade');
            });
        }

        // 5. NSFP Pool (Nomor Seri Faktur Pajak e-Nofa DJP)
        if (!Schema::hasTable('nsfp_pools')) {
            Schema::create('nsfp_pools', function (Blueprint $table) {
                $table->id();
                $table->string('tax_year', 4)->default('2026'); // Tahun pajak
                $table->string('prefix', 20)->default('010.001-26.'); // Prefix NSFP (Kode Transaksi + Kode Cabang + Tahun)
                $table->bigInteger('start_number'); // e.g. 1
                $table->bigInteger('end_number'); // e.g. 100
                $table->bigInteger('current_number'); // Last allocated number
                $table->integer('total_allocated')->default(0);
                $table->integer('total_used')->default(0);
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->timestamps();
            });

            // Seed initial NSFP pool example
            DB::table('nsfp_pools')->insert([
                'tax_year' => '2026',
                'prefix' => '010.001-26.',
                'start_number' => 10000001,
                'end_number' => 10000100,
                'current_number' => 10000001,
                'total_allocated' => 100,
                'total_used' => 0,
                'is_active' => true,
                'notes' => 'Alokasi Awal DJP e-Nofa Tahun Pajak 2026 (Jatah 100 Nomor Seri)',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 6. Faktur Pajak Table (DJP Indonesian Tax Standard)
        if (!Schema::hasTable('faktur_pajaks')) {
            Schema::create('faktur_pajaks', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('commercial_invoice_id')->unique();
                $table->string('nsfp_number', 50)->unique(); // Full NSFP: e.g. 010.001-26.10000001
                $table->integer('tax_period_month')->default(10);
                $table->integer('tax_period_year')->default(2026);
                $table->string('transaction_code', 5)->default('01'); // 01 Penyerahan BKP/JKP selain Pemungut
                $table->date('faktur_date');
                // Penjual (PKP)
                $table->string('seller_name', 150)->default('PT Virtuenet Digital Indonesia');
                $table->string('seller_npwp', 50)->default('01.234.567.8-012.000');
                $table->text('seller_address')->default('South Quarter Tower A, Jl. R.A. Kartini Kav. 8, Cilandak Barat, Jakarta Selatan 12430');
                // Pembeli
                $table->string('buyer_name', 150);
                $table->string('buyer_npwp', 50)->nullable();
                $table->string('buyer_nik', 30)->nullable();
                $table->text('buyer_address')->nullable();
                // Financials
                $table->decimal('dpp_amount', 15, 2)->default(0.00); // Dasar Pengenaan Pajak
                $table->decimal('ppn_percentage', 5, 2)->default(11.00); // 11%
                $table->decimal('ppn_amount', 15, 2)->default(0.00); // Nilai PPN
                $table->decimal('ppnbm_amount', 15, 2)->default(0.00);
                $table->string('status', 30)->default('draft'); // draft, approved, rejected, cancelled
                $table->string('approval_code', 100)->nullable(); // DJP verification code / QR code
                $table->string('pdf_path', 255)->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
                $table->timestamps();

                $table->foreign('commercial_invoice_id')
                    ->references('id')
                    ->on('commercial_invoices')
                    ->onDelete('cascade');
            });
        }

        // 7. Add NSFP & Faktur Pajak reference columns to commercial_invoices if missing
        if (Schema::hasTable('commercial_invoices')) {
            Schema::table('commercial_invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('commercial_invoices', 'faktur_pajak_id')) {
                    $table->unsignedBigInteger('faktur_pajak_id')->nullable()->after('pdf_path');
                }
                if (!Schema::hasColumn('commercial_invoices', 'nsfp_number')) {
                    $table->string('nsfp_number', 50)->nullable()->after('faktur_pajak_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('commercial_invoices')) {
            Schema::table('commercial_invoices', function (Blueprint $table) {
                if (Schema::hasColumn('commercial_invoices', 'nsfp_number')) {
                    $table->dropColumn('nsfp_number');
                }
                if (Schema::hasColumn('commercial_invoices', 'faktur_pajak_id')) {
                    $table->dropColumn('faktur_pajak_id');
                }
            });
        }

        Schema::dropIfExists('faktur_pajaks');
        Schema::dropIfExists('nsfp_pools');
        Schema::dropIfExists('sales_order_billing_schedules');

        if (Schema::hasTable('lead_sales_orders')) {
            Schema::table('lead_sales_orders', function (Blueprint $table) {
                $cols = ['billing_schedules_json', 'first_invoice_date', 'payment_term_type', 'payment_term_id'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('lead_sales_orders', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('lead_quotations')) {
            Schema::table('lead_quotations', function (Blueprint $table) {
                $cols = ['billing_schedules_json', 'first_invoice_date', 'payment_term_type', 'payment_term_id'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('lead_quotations', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        Schema::dropIfExists('payment_terms');
    }
};
