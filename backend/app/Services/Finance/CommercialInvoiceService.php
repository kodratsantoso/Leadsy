<?php

namespace App\Services\Finance;

use App\Models\CommercialInvoice;
use App\Models\CommercialInvoiceItem;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadQuotation;
use App\Models\PsDocument;
use App\Services\Notification\CrossDepartmentNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
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
                'bank_details' => $params['bank_details'] ?? "Bank Mandiri (Persero) Tbk\nNo. Rekening: 122-00-1122334-5\na.n. PT Virtue Digital Enterprise",
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

            // Dispatch notification to Finance and Account Manager
            $this->notificationService->notifyInvoiceGenerated($invoice);

            return $invoice;
        });
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
