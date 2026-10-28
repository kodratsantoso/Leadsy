<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommercialInvoice;
use App\Models\Lead;
use App\Models\PsDocument;
use App\Services\Finance\CommercialInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CommercialInvoiceController extends Controller
{
    public function __construct(
        protected CommercialInvoiceService $invoiceService
    ) {}

    /**
     * List all commercial invoices for a lead.
     */
    public function index(Request $request, Lead $lead): JsonResponse
    {
        $invoices = CommercialInvoice::where('lead_id', $lead->id)
            ->with(['items', 'psDocument:id,document_number,document_title,document_type'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $invoices,
            'summary' => [
                'total_invoiced' => $invoices->sum('total_amount'),
                'total_paid' => $invoices->sum('paid_amount'),
                'total_outstanding' => $invoices->sum('total_amount') - $invoices->sum('paid_amount'),
                'invoices_count' => $invoices->count(),
            ],
        ]);
    }

    /**
     * Generate a new commercial invoice directly from a BAST document.
     */
    public function storeFromBast(Request $request, Lead $lead, PsDocument $document): JsonResponse
    {
        $validated = $request->validate([
            'milestone_name' => 'nullable|string|max:150',
            'milestone_percentage' => 'nullable|numeric|min:1|max:100',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'withholding_tax_percentage' => 'nullable|numeric|min:0|max:100',
            'payment_terms' => 'nullable|string|max:50',
            'bank_details' => 'nullable|string',
            'notes' => 'nullable|string',
            'base_amount' => 'nullable|numeric|min:0',
        ]);

        $invoice = $this->invoiceService->createFromBast($lead, $document, $validated);

        return response()->json([
            'status' => 'success',
            'message' => "Faktur penagihan #{$invoice->invoice_number} berhasil diterbitkan atas BAST #{$document->document_number}.",
            'data' => $invoice->load('items'),
        ], Response::HTTP_CREATED);
    }

    /**
     * Get single invoice details.
     */
    public function show(int $id): JsonResponse
    {
        $invoice = CommercialInvoice::with(['lead', 'items', 'psDocument', 'quotation'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $invoice,
        ]);
    }

    /**
     * Download or stream invoice document.
     */
    public function download(int $id): Response
    {
        $invoice = CommercialInvoice::with(['lead', 'items', 'psDocument'])->findOrFail($id);

        $html = view('reports.commercial-invoice', compact('invoice'))->render();

        // Stream HTML/PDF with invoice disposition
        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "inline; filename=\"Invoice_{$invoice->invoice_number}.html\"",
        ]);
    }

    /**
     * Record payment for an invoice.
     */
    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'paid_at' => 'nullable|date',
        ]);

        $invoice = CommercialInvoice::findOrFail($id);
        $updated = $this->invoiceService->recordPayment($invoice, (float)$validated['amount'], $validated['paid_at'] ?? null);

        return response()->json([
            'status' => 'success',
            'message' => "Pembayaran sebesar Rp " . number_format($validated['amount'], 0, ',', '.') . " berhasil dicatat.",
            'data' => $updated,
        ]);
    }
}
