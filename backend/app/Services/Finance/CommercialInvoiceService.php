<?php

namespace App\Services\Finance;

use App\Models\CommercialInvoice;
use App\Models\CommercialInvoiceItem;
use App\Models\CompanyBankAccount;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\PsDocument;
use App\Models\SalesOrderBillingSchedule;
use App\Models\Tenant;
use App\Services\Notification\CrossDepartmentNotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CommercialInvoiceService
{
    public function __construct(
        protected CrossDepartmentNotificationService $notificationService
    ) {}

    /**
     * Generate a new commercial invoice directly from a BAST document.
     */
    public function createFromBast(Lead $lead, PsDocument $bastDocument, array $params = []): CommercialInvoice
    {
        return DB::transaction(function () use ($lead, $bastDocument, $params) {
            $milestoneName = $params['milestone_name'] ?? ($bastDocument->document_title ?: 'Penagihan Berita Acara (BAST)');
            $milestonePercentage = (float) ($params['milestone_percentage'] ?? 50.0);
            $taxPercentage = (float) ($params['tax_percentage'] ?? 11.0);
            $withholdingPercentage = (float) ($params['withholding_tax_percentage'] ?? 0.0);
            $paymentTerms = $params['payment_terms'] ?? 'Net 30';

            // Find quotation or fallback to estimation or default commercial base
            $quotation = null;
            if ($bastDocument->quotation_id) {
                $quotation = LeadQuotation::find($bastDocument->quotation_id);
            } elseif ($bastDocument->estimation_id) {
                $quotation = LeadQuotation::where('lead_id', $lead->id)->latest()->first();
            }

            $baseAmount = 0;
            if ($quotation && (float)$quotation->total_amount > 0) {
                $baseAmount = (float)$quotation->subtotal_amount > 0 ? (float)$quotation->subtotal_amount : (float)$quotation->total_amount;
            } else {
                $baseAmount = (float) ($params['base_amount'] ?? 100000000); // 100jt fallback
            }

            $subtotal = round(($baseAmount * ($milestonePercentage / 100)), 2);
            $taxAmount = round(($subtotal * ($taxPercentage / 100)), 2);
            $withholdingAmount = round(($subtotal * ($withholdingPercentage / 100)), 2);
            $totalAmount = round(($subtotal + $taxAmount - $withholdingAmount), 2);

            $invoiceDate = Carbon::now()->toDateString();
            $dueDate = Carbon::now()->addDays(30)->toDateString();

            // Next sequential invoice number
            $invoiceNumber = $this->generateInvoiceNumber();

            $invoice = CommercialInvoice::create([
                'invoice_number' => $invoiceNumber,
                'lead_id' => $lead->id,
                'quotation_id' => $quotation?->id,
                'sales_order_id' => $quotation?->converted_sales_order_id,
                'ps_document_id' => $bastDocument->id,
                'milestone_name' => $milestoneName,
                'milestone_percentage' => $milestonePercentage,
                'subtotal' => $subtotal,
                'tax_percentage' => $taxPercentage,
                'tax_amount' => $taxAmount,
                'withholding_tax_percentage' => $withholdingPercentage,
                'withholding_tax_amount' => $withholdingAmount,
                'total_amount' => $totalAmount,
                'currency' => 'IDR',
                'status' => 'draft',
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'payment_terms' => $paymentTerms,
                'bank_details' => $params['bank_details'] ?? "Bank Mandiri (Persero) Tbk\nNo. Rekening: 122-00-1122334-5\na.n. PT Virtuenet Digital Indonesia",
                'notes' => $params['notes'] ?? "Faktur ini diterbitkan secara sah berdasarkan persetujuan Berita Acara Serah Terima (BAST) No. {$bastDocument->document_number}.",
                'created_by' => auth()->id(),
                'tenant_id' => $lead->tenant_id ?? auth()->user()?->tenant_id,
            ]);

            // Add standard line items
            CommercialInvoiceItem::create([
                'commercial_invoice_id' => $invoice->id,
                'item_description' => "Termin Penagihan {$milestonePercentage}%: {$milestoneName} (Ref BAST: {$bastDocument->document_number})",
                'quantity' => 1,
                'unit' => 'Termin',
                'unit_price' => $subtotal,
                'amount' => $subtotal,
            ]);

            // Record timeline activity
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'activity_type' => 'invoice_created',
                'notes' => "[INVOICE CREATED] Faktur penagihan #{$invoiceNumber} berhasil diterbitkan senilai Rp " . number_format($totalAmount, 0, ',', '.') . " atas penyelesaian BAST #{$bastDocument->document_number}.",
                'tenant_id' => $lead->tenant_id,
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoiceNumber,
                    'bast_id' => $bastDocument->id,
                    'total_amount' => $totalAmount,
                ],
            ]);

            $this->generateInvoicePdf($invoice);

            // Dispatch notification to Finance and Account Manager
            $this->notificationService->notifyInvoiceGenerated($invoice);

            return $invoice;
        });
    }

    /**
     * Generate invoice automatically from a scheduled termin / billing schedule.
     */
    public function createFromBillingSchedule(SalesOrderBillingSchedule $schedule, array $params = []): CommercialInvoice
    {
        return DB::transaction(function () use ($schedule, $params) {
            $salesOrder = $schedule->salesOrder;
            $lead = $salesOrder?->lead;

            if (!$salesOrder || !$lead) {
                throw new Exception("Sales Order atau Lead data tidak ditemukan untuk jadwal termin #{$schedule->id}.");
            }

            $invoiceNumber = $this->generateInvoiceNumber();
            $invoiceDate = $params['invoice_date'] ?? ($schedule->scheduled_date ? Carbon::parse($schedule->scheduled_date)->toDateString() : Carbon::today()->toDateString());
            $dueDate = $params['due_date'] ?? ($schedule->due_date ? Carbon::parse($schedule->due_date)->toDateString() : Carbon::parse($invoiceDate)->addDays(30)->toDateString());

            $bankAccount = $salesOrder->bank_account_id ? CompanyBankAccount::find($salesOrder->bank_account_id) : CompanyBankAccount::where('is_default', true)->first();
            $bankDetails = $bankAccount 
                ? "{$bankAccount->bank_name}\nNo. Rekening: {$bankAccount->account_number}\na.n. {$bankAccount->account_name}"
                : "Bank Mandiri (Persero) Tbk\nNo. Rekening: 122-00-1122334-5\na.n. PT Virtuenet Digital Indonesia";

            $subtotal = (float)$schedule->amount;
            $taxAmount = (float)$schedule->tax_amount;
            $withholdingTaxAmount = (float)$schedule->withholding_tax_amount;
            $totalAmount = (float)$schedule->total_amount;

            $invoice = CommercialInvoice::create([
                'invoice_number' => $invoiceNumber,
                'lead_id' => $lead->id,
                'quotation_id' => $salesOrder->quotation_id,
                'sales_order_id' => $salesOrder->id,
                'ps_document_id' => $schedule->ps_document_id,
                'milestone_name' => $schedule->term_name,
                'milestone_percentage' => $schedule->percentage,
                'subtotal' => $subtotal,
                'tax_percentage' => 11.0,
                'tax_amount' => $taxAmount,
                'withholding_tax_percentage' => $withholdingTaxAmount > 0 && $subtotal > 0 ? round(($withholdingTaxAmount / $subtotal) * 100, 2) : 0.0,
                'withholding_tax_amount' => $withholdingTaxAmount,
                'total_amount' => $totalAmount,
                'currency' => $salesOrder->currency ?: 'IDR',
                'status' => 'draft',
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'payment_terms' => $salesOrder->payment_terms ?: 'Net 30',
                'bank_details' => $bankDetails,
                'notes' => $params['notes'] ?? "Tagihan termin ke-{$schedule->term_number} sesuai Sales Order No. {$salesOrder->sales_order_number}.",
                'created_by' => auth()->id() ?? $salesOrder->created_by,
                'tenant_id' => $salesOrder->tenant_id,
            ]);

            // Add line items
            CommercialInvoiceItem::create([
                'commercial_invoice_id' => $invoice->id,
                'item_description' => "{$schedule->term_name} (Ref SO: {$salesOrder->sales_order_number})",
                'quantity' => 1,
                'unit' => 'Termin',
                'unit_price' => $subtotal,
                'amount' => $subtotal,
            ]);

            // Update schedule record
            $schedule->update([
                'status' => 'generated',
                'commercial_invoice_id' => $invoice->id,
            ]);

            // Record timeline activity
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id() ?? $salesOrder->created_by,
                'activity_type' => 'invoice_created',
                'notes' => "[SCHEDULED INVOICE GENERATED] Faktur #{$invoiceNumber} otomatis diterbitkan untuk termin: {$schedule->term_name} senilai Rp " . number_format($totalAmount, 0, ',', '.') . ".",
                'tenant_id' => $lead->tenant_id,
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoiceNumber,
                    'schedule_id' => $schedule->id,
                    'sales_order_id' => $salesOrder->id,
                    'total_amount' => $totalAmount,
                ],
            ]);

            // Render PDF immediately
            $this->generateInvoicePdf($invoice);

            // Dispatch notification
            $this->notificationService->notifyInvoiceGenerated($invoice);

            return $invoice;
        });
    }

    /**
     * Render and store professional PDF for a Commercial Invoice.
     */
    public function generateInvoicePdf(CommercialInvoice $invoice): array
    {
        $tenant = Tenant::first();
        $lead = $invoice->lead;
        $salesOrder = $invoice->salesOrder;

        $tenantName = $tenant?->name ?? 'PT Virtuenet Digital Indonesia';
        $tenantNpwp = '01.234.567.8-012.000';
        $tenantAddress = 'South Quarter Tower A, Jl. R.A. Kartini Kav. 8, Cilandak Barat, Jakarta Selatan 12430';
        $tenantEmail = 'finance@virtuenet.id';
        $tenantPhone = '+62 21 8060 1234';

        // Logo Base64
        $logoBase64 = null;
        $logoPath = public_path('images/logo.png');
        if (!file_exists($logoPath)) {
            $logoPath = public_path('brand/leadsy-logo.png');
        }
        if (file_exists($logoPath)) {
            $logoData = file_get_contents($logoPath);
            $mime = mime_content_type($logoPath) ?: 'image/png';
            $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode($logoData);
        }

        // Bank details parsing
        $bankAccount = $salesOrder?->bank_account_id ? CompanyBankAccount::find($salesOrder->bank_account_id) : CompanyBankAccount::where('is_default', true)->first();
        $bankName = $bankAccount?->bank_name ?? 'Bank Mandiri (Persero) Tbk';
        $bankAccountNumber = $bankAccount?->account_number ?? '122-00-1122334-5';
        $bankAccountHolder = $bankAccount?->account_name ?? 'PT Virtuenet Digital Indonesia';

        $items = [];
        if ($invoice->items && $invoice->items->count() > 0) {
            foreach ($invoice->items as $it) {
                $items[] = [
                    'description' => $it->item_description,
                    'quantity' => (float)$it->quantity,
                    'unit' => $it->unit ?? 'Unit',
                    'unit_price' => (float)$it->unit_price,
                    'amount' => (float)$it->amount,
                    'notes' => null,
                ];
            }
        } else {
            $items[] = [
                'description' => $invoice->milestone_name ?? 'Penyerahan Layanan / Produk',
                'quantity' => 1,
                'unit' => 'Termin',
                'unit_price' => (float)$invoice->subtotal,
                'amount' => (float)$invoice->subtotal,
                'notes' => null,
            ];
        }

        $statusClass = 'status-draft';
        if ($invoice->status === 'paid') {
            $statusClass = 'status-paid';
        } elseif ($invoice->status === 'unpaid' || $invoice->status === 'sent') {
            $statusClass = 'status-unpaid';
        }

        $terbilangWords = $this->terbilang((float)$invoice->total_amount);

        $data = [
            'docTitle' => 'Commercial Invoice',
            'invoiceNumber' => $invoice->invoice_number,
            'invoiceStatus' => $invoice->status ?: 'draft',
            'statusClass' => $statusClass,
            'tenantName' => $tenantName,
            'tenantNpwp' => $tenantNpwp,
            'tenantAddress' => $tenantAddress,
            'tenantEmail' => $tenantEmail,
            'tenantPhone' => $tenantPhone,
            'logoBase64' => $logoBase64,
            'customerName' => $lead?->company_name ?? ($salesOrder?->customer_name ?? 'Pelanggan'),
            'customerAddress' => $lead?->address ?? ($lead?->city ? $lead->city . ', Indonesia' : null),
            'customerPic' => $lead?->contacts?->first()?->name ?? null,
            'customerNpwp' => $lead?->tax_identification_number ?? null,
            'invoiceDate' => $invoice->invoice_date ? Carbon::parse($invoice->invoice_date)->format('d F Y') : Carbon::today()->format('d F Y'),
            'dueDate' => $invoice->due_date ? Carbon::parse($invoice->due_date)->format('d F Y') : Carbon::today()->addDays(30)->format('d F Y'),
            'paymentTerms' => $invoice->payment_terms ?: 'Net 30',
            'salesOrderRef' => $salesOrder?->sales_order_number ?? null,
            'customerPoNumber' => $salesOrder?->customer_po_number ?? null,
            'nsfpNumber' => $invoice->nsfp_number ?? null,
            'items' => $items,
            'bankName' => $bankName,
            'bankAccountNumber' => $bankAccountNumber,
            'bankAccountHolder' => $bankAccountHolder,
            'notes' => $invoice->notes,
            'terbilang' => $terbilangWords,
            'subtotal' => (float)$invoice->subtotal,
            'discountAmount' => 0.0,
            'taxPercentage' => (float)($invoice->tax_percentage ?: 11.0),
            'taxAmount' => (float)$invoice->tax_amount,
            'withholdingTaxPercentage' => (float)($invoice->withholding_tax_percentage ?: 0.0),
            'withholdingTaxAmount' => (float)($invoice->withholding_tax_amount ?: 0.0),
            'totalAmount' => (float)$invoice->total_amount,
            'paidAmount' => (float)($invoice->paid_amount ?: 0.0),
        ];

        $pdf = Pdf::loadView('pdf.commercial-invoice', $data);
        $pdf->setPaper('a4', 'portrait');

        $filename = 'invoice-' . Str::slug($invoice->invoice_number) . '.pdf';
        $relativeDir = 'invoices/' . date('Y/m');
        $relativePath = $relativeDir . '/' . $filename;

        Storage::disk('public')->put($relativePath, $pdf->output());

        $publicUrl = '/storage/' . $relativePath;
        $invoice->update(['pdf_path' => $publicUrl]);

        return [
            'pdf_path' => $publicUrl,
            'filename' => $filename,
            'raw_content' => $pdf->output(),
        ];
    }

    /**
     * Indonesian number to words conversion (Terbilang).
     */
    public function terbilang(float $number): string
    {
        $number = abs((int)$number);
        $words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

        if ($number < 12) {
            return $words[$number];
        } elseif ($number < 20) {
            return $this->terbilang($number - 10) . " Belas";
        } elseif ($number < 100) {
            return $this->terbilang((int)($number / 10)) . " Puluh " . $this->terbilang($number % 10);
        } elseif ($number < 200) {
            return "Seratus " . $this->terbilang($number - 100);
        } elseif ($number < 1000) {
            return $this->terbilang((int)($number / 100)) . " Ratus " . $this->terbilang($number % 100);
        } elseif ($number < 2000) {
            return "Seribu " . $this->terbilang($number - 1000);
        } elseif ($number < 1000000) {
            return $this->terbilang((int)($number / 1000)) . " Ribu " . $this->terbilang($number % 1000);
        } elseif ($number < 1000000000) {
            return $this->terbilang((int)($number / 1000000)) . " Juta " . $this->terbilang($number % 1000000);
        } elseif ($number < 1000000000000) {
            return $this->terbilang((int)($number / 1000000000)) . " Miliar " . $this->terbilang(fmod($number, 1000000000));
        }

        return trim(preg_replace('/\s+/', ' ', (string)$number));
    }

    /**
     * Generate an invoice number: INV-YYYYMM-XXXX
     */
    protected function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . date('Ym') . '-';
        $latest = CommercialInvoice::where('invoice_number', 'LIKE', $prefix . '%')
            ->orderBy('id', 'desc')
            ->first();

        if ($latest && preg_match('/-(\d+)$/', $latest->invoice_number, $matches)) {
            $next = str_pad(((int) $matches[1]) + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $next = '0001';
        }

        return $prefix . $next;
    }

    /**
     * Record payment on an invoice.
     */
    public function recordPayment(CommercialInvoice $invoice, float $amount, ?string $paidAt = null): CommercialInvoice
    {
        $currentPaid = (float) $invoice->paid_amount + $amount;
        $totalAmount = (float) $invoice->total_amount;

        $newStatus = 'partially_paid';
        if ($currentPaid >= $totalAmount) {
            $newStatus = 'paid';
        }

        $invoice->update([
            'paid_amount' => $currentPaid,
            'status' => $newStatus,
            'paid_at' => $paidAt ? Carbon::parse($paidAt) : Carbon::now(),
        ]);

        LeadActivity::create([
            'lead_id' => $invoice->lead_id,
            'user_id' => auth()->id(),
            'activity_type' => 'payment_recorded',
            'notes' => "[PAYMENT RECORDED] Pembayaran sebesar Rp " . number_format($amount, 0, ',', '.') . " diterima untuk Faktur #{$invoice->invoice_number}. Status faktur kini: {$newStatus}.",
            'tenant_id' => $invoice->tenant_id,
            'metadata' => [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $amount,
                'status' => $newStatus,
            ],
        ]);

        return $invoice;
    }
}
