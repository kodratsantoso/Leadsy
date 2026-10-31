<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommercialInvoice;
use App\Models\FakturPajak;
use App\Models\LeadSalesOrder;
use App\Models\SalesOrderBillingSchedule;
use App\Services\Finance\BillingScheduleService;
use App\Services\Finance\CommercialInvoiceService;
use App\Services\Finance\FakturPajakService;
use App\Services\Finance\NsfpPoolService;
use App\Services\Integration\MekariSignService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceHubController extends Controller
{
    public function __construct(
        protected CommercialInvoiceService $invoiceService,
        protected FakturPajakService $fakturPajakService,
        protected NsfpPoolService $nsfpPoolService,
        protected BillingScheduleService $billingScheduleService,
        protected MekariSignService $mekariSignService
    ) {}

    /**
     * Get aggregate KPIs for the Finance Dashboard.
     */
    public function getOverview(): JsonResponse
    {
        $totalInvoicesCount = CommercialInvoice::count();
        $totalInvoicedAmount = (float)CommercialInvoice::sum('total_amount');
        $totalPaidAmount = (float)CommercialInvoice::sum('paid_amount');
        $totalOutstandingAmount = max(0, $totalInvoicedAmount - $totalPaidAmount);

        $nowDate = Carbon::today()->toDateString();
        $overdueCount = CommercialInvoice::whereIn('status', ['draft', 'sent', 'unpaid', 'partially_paid'])
            ->whereDate('due_date', '<', $nowDate)
            ->count();

        $nsfpSummary = $this->nsfpPoolService->getPoolSummary();

        $pendingSchedulesCount = SalesOrderBillingSchedule::where('status', 'pending')
            ->whereDate('scheduled_date', '<=', $nowDate)
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_invoices_count' => $totalInvoicesCount,
                'total_invoiced_amount' => $totalInvoicedAmount,
                'total_paid_amount' => $totalPaidAmount,
                'total_outstanding_amount' => $totalOutstandingAmount,
                'overdue_invoices_count' => $overdueCount,
                'pending_schedules_due_count' => $pendingSchedulesCount,
                'nsfp_summary' => $nsfpSummary,
            ]
        ]);
    }

    /**
     * List all commercial invoices with filtering and pagination.
     */
    public function getInvoices(Request $request): JsonResponse
    {
        $query = CommercialInvoice::with(['lead', 'salesOrder', 'fakturPajak']);

        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ILIKE', "%{$search}%")
                  ->orWhere('milestone_name', 'ILIKE', "%{$search}%")
                  ->orWhereHas('lead', function ($ql) use ($search) {
                      $ql->where('company_name', 'ILIKE', "%{$search}%");
                  });
            });
        }

        $invoices = $query->orderBy('id', 'desc')->paginate($request->query('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $invoices,
        ]);
    }

    /**
     * Get single invoice detail with items.
     */
    public function getInvoiceDetails(CommercialInvoice $invoice): JsonResponse
    {
        $invoice->load(['lead.contacts', 'salesOrder', 'items', 'fakturPajak']);

        return response()->json([
            'status' => 'success',
            'data' => $invoice,
        ]);
    }

    /**
     * Preview or generate invoice PDF on the fly.
     */
    public function previewInvoicePdf(CommercialInvoice $invoice)
    {
        $pdfResult = $this->invoiceService->generateInvoicePdf($invoice);

        return response($pdfResult['raw_content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $pdfResult['filename'] . '"',
        ]);
    }

    /**
     * Generate official DJP Faktur Pajak for an invoice.
     */
    public function generateFakturPajak(CommercialInvoice $invoice, Request $request): JsonResponse
    {
        try {
            $faktur = $this->fakturPajakService->generateFromInvoice($invoice, $request->all());

            return response()->json([
                'status' => 'success',
                'message' => "Faktur Pajak #{$faktur->nsfp_number} berhasil diterbitkan.",
                'data' => $faktur,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * List all Faktur Pajak.
     */
    public function getFakturPajaks(Request $request): JsonResponse
    {
        $query = FakturPajak::with(['invoice.lead']);

        if ($request->has('tax_year')) {
            $query->where('tax_period_year', $request->query('tax_year'));
        }

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('nsfp_number', 'ILIKE', "%{$search}%")
                  ->orWhere('buyer_name', 'ILIKE', "%{$search}%")
                  ->orWhere('buyer_npwp', 'ILIKE', "%{$search}%");
            });
        }

        $fakturs = $query->orderBy('id', 'desc')->paginate($request->query('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $fakturs,
        ]);
    }

    /**
     * Preview or download Faktur Pajak PDF.
     */
    public function previewFakturPajakPdf(FakturPajak $faktur)
    {
        $pdfResult = $this->fakturPajakService->renderPdf($faktur);

        return response($pdfResult['raw_content'], 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $pdfResult['filename'] . '"',
        ]);
    }

    /**
     * Export DJP e-Faktur CSV import file.
     */
    public function exportDjpCsv(Request $request): StreamedResponse
    {
        $fakturIds = $request->query('ids') ? explode(',', $request->query('ids')) : [];
        $csvContent = $this->fakturPajakService->exportDjpCsv($fakturIds);

        $filename = 'DJP_eFaktur_Export_' . date('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($csvContent) {
            echo $csvContent;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * Get NSFP Pools status and list.
     */
    public function getNsfpPools(): JsonResponse
    {
        $summary = $this->nsfpPoolService->getPoolSummary();

        return response()->json([
            'status' => 'success',
            'data' => $summary,
        ]);
    }

    /**
     * Add new NSFP pool range.
     */
    public function storeNsfpPool(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tax_year' => 'required|string|size:4',
            'prefix' => 'required|string|max:20',
            'start_number' => 'required|integer|min:1',
            'end_number' => 'required|integer|gte:start_number',
            'notes' => 'nullable|string',
        ]);

        try {
            $pool = $this->nsfpPoolService->addPoolRange(
                $validated['tax_year'],
                $validated['prefix'],
                (int)$validated['start_number'],
                (int)$validated['end_number'],
                $validated['notes'] ?? null
            );

            return response()->json([
                'status' => 'success',
                'message' => "Alokasi NSFP {$pool->total_allocated} nomor berhasil ditambahkan ke sistem.",
                'data' => $pool,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Trigger Billing Scheduler manually on demand.
     */
    public function runSchedulerManual(Request $request): JsonResponse
    {
        $targetDate = $request->input('date', Carbon::today()->toDateString());
        
        Artisan::call('finance:run-billing-scheduler', [
            '--date' => $targetDate,
        ]);

        $output = Artisan::output();

        return response()->json([
            'status' => 'success',
            'message' => 'Automation Billing Scheduler berhasil dijalankan.',
            'output' => $output,
        ]);
    }

    /**
     * Get billing schedules for a Sales Order.
     */
    public function getSalesOrderSchedules(LeadSalesOrder $salesOrder): JsonResponse
    {
        $schedules = $salesOrder->billingSchedules()->with(['invoice'])->get();

        return response()->json([
            'status' => 'success',
            'data' => $schedules,
        ]);
    }

    /**
     * Sync billing schedules for a Sales Order.
     */
    public function syncSalesOrderSchedules(LeadSalesOrder $salesOrder, Request $request): JsonResponse
    {
        $paymentTermId = $request->input('payment_term_id');
        $customSchedules = $request->input('schedules', []);

        $schedules = $this->billingScheduleService->syncSchedulesForSalesOrder($salesOrder, $paymentTermId, $customSchedules);

        return response()->json([
            'status' => 'success',
            'message' => 'Jadwal termin berhasil diperbarui.',
            'data' => $schedules,
        ]);
    }

    /**
     * Send Commercial Document (Quotation or Sales Order) to Mekari Sign.
     */
    public function sendMekariSign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:quotation,sales_order',
            'id' => 'required|integer',
            'customer_name' => 'nullable|string',
            'customer_email' => 'required|email',
            'customer_phone' => 'nullable|string',
            'use_emeterai' => 'nullable|boolean',
        ]);

        try {
            $result = $this->mekariSignService->sendCommercialDocument(
                $validated['type'],
                (int)$validated['id'],
                $validated,
                (bool)($validated['use_emeterai'] ?? false)
            );

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Mekari Sign Webhook Endpoint.
     */
    public function handleMekariWebhook(Request $request): JsonResponse
    {
        $result = $this->mekariSignService->handleWebhook($request->all());

        return response()->json($result);
    }
}
