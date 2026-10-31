<?php

namespace App\Services\Finance;

use App\Models\CommercialInvoice;
use App\Models\FakturPajak;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FakturPajakService
{
    public function __construct(
        protected NsfpPoolService $nsfpPoolService
    ) {}

    /**
     * Generate a new Faktur Pajak for a Commercial Invoice.
     */
    public function generateFromInvoice(CommercialInvoice $invoice, array $overrides = []): FakturPajak
    {
        return DB::transaction(function () use ($invoice, $overrides) {
            if ($invoice->fakturPajak) {
                return $invoice->fakturPajak;
            }

            $lead = $invoice->lead;
            $taxYear = date('Y', strtotime($invoice->invoice_date ?: 'now'));
            $taxMonth = (int)date('m', strtotime($invoice->invoice_date ?: 'now'));

            // Allocate next NSFP
            $nsfp = $overrides['nsfp_number'] ?? $this->nsfpPoolService->allocateNextNsfp($taxYear);

            $tenant = Tenant::first();
            $sellerName = $tenant?->name ?? 'PT Virtuenet Digital Indonesia';
            $sellerNpwp = '01.234.567.8-012.000';
            $sellerAddress = 'South Quarter Tower A, Jl. R.A. Kartini Kav. 8, Cilandak Barat, Jakarta Selatan 12430';

            $buyerName = $lead?->company_name ?? ($invoice->quotation?->customer_name ?? 'Pelanggan');
            $buyerNpwp = $overrides['buyer_npwp'] ?? ($lead?->tax_identification_number ?? null);
            $buyerAddress = $lead?->address ?? ($lead?->city ? $lead->city . ', Indonesia' : 'Indonesia');

            $dppAmount = (float)$invoice->subtotal;
            $ppnPercentage = (float)($invoice->tax_percentage > 0 ? $invoice->tax_percentage : 11.0);
            $ppnAmount = (float)$invoice->tax_amount > 0 ? (float)$invoice->tax_amount : round($dppAmount * ($ppnPercentage / 100), 2);

            $faktur = FakturPajak::create([
                'commercial_invoice_id' => $invoice->id,
                'nsfp_number' => $nsfp,
                'tax_period_month' => $taxMonth,
                'tax_period_year' => (int)$taxYear,
                'transaction_code' => $overrides['transaction_code'] ?? '01',
                'faktur_date' => $invoice->invoice_date ? Carbon::parse($invoice->invoice_date)->toDateString() : Carbon::today()->toDateString(),
                'seller_name' => $sellerName,
                'seller_npwp' => $sellerNpwp,
                'seller_address' => $sellerAddress,
                'buyer_name' => $buyerName,
                'buyer_npwp' => $buyerNpwp,
                'buyer_nik' => $overrides['buyer_nik'] ?? null,
                'buyer_address' => $buyerAddress,
                'dpp_amount' => $dppAmount,
                'ppn_percentage' => $ppnPercentage,
                'ppn_amount' => $ppnAmount,
                'ppnbm_amount' => 0.0,
                'status' => 'approved',
                'approval_code' => 'DJP-' . strtoupper(Str::random(12)),
                'created_by' => auth()->id(),
                'tenant_id' => $invoice->tenant_id,
            ]);

            // Link back to invoice
            $invoice->update([
                'faktur_pajak_id' => $faktur->id,
                'nsfp_number' => $nsfp,
            ]);

            // Render PDF immediately
            $this->renderPdf($faktur);

            return $faktur;
        });
    }

    /**
     * Render and save PDF for Faktur Pajak.
     */
    public function renderPdf(FakturPajak $faktur): array
    {
        $invoice = $faktur->invoice;
        $items = [];

        if ($invoice && $invoice->items->count() > 0) {
            foreach ($invoice->items as $it) {
                $items[] = [
                    'description' => $it->item_description,
                    'amount' => (float)$it->amount,
                ];
            }
        } else {
            $items[] = [
                'description' => $invoice?->milestone_name ?? 'Penyerahan Jasa Kena Pajak / Lisensi Perangkat Lunak',
                'amount' => (float)$faktur->dpp_amount,
            ];
        }

        $fakturDateFormatted = Carbon::parse($faktur->faktur_date)->translatedFormat('d F Y');

        $data = [
            'nsfpNumber' => $faktur->nsfp_number,
            'sellerName' => $faktur->seller_name,
            'sellerAddress' => $faktur->seller_address,
            'sellerNpwp' => $faktur->seller_npwp,
            'buyerName' => $faktur->buyer_name,
            'buyerAddress' => $faktur->buyer_address,
            'buyerNpwp' => $faktur->buyer_npwp,
            'buyerNik' => $faktur->buyer_nik,
            'items' => $items,
            'invoiceRef' => $invoice?->invoice_number,
            'dppAmount' => $faktur->dpp_amount,
            'ppnPercentage' => $faktur->ppn_percentage,
            'ppnAmount' => $faktur->ppn_amount,
            'transactionCode' => $faktur->transaction_code,
            'taxPeriodMonth' => $faktur->tax_period_month,
            'taxPeriodYear' => $faktur->tax_period_year,
            'approvalCode' => $faktur->approval_code,
            'fakturDate' => $fakturDateFormatted,
        ];

        $pdf = Pdf::loadView('pdf.faktur-pajak', $data);
        $pdf->setPaper('a4', 'portrait');

        $filename = 'faktur-pajak-' . Str::slug($faktur->nsfp_number) . '.pdf';
        $relativeDir = 'faktur-pajak/' . date('Y/m');
        $relativePath = $relativeDir . '/' . $filename;

        Storage::disk('public')->put($relativePath, $pdf->output());

        $publicUrl = '/storage/' . $relativePath;
        $faktur->update(['pdf_path' => $publicUrl]);

        return [
            'pdf_path' => $publicUrl,
            'filename' => $filename,
            'raw_content' => $pdf->output(),
        ];
    }

    /**
     * Export selected or all Faktur Pajak into standard DJP e-Faktur CSV format.
     */
    public function exportDjpCsv(array $fakturIds = []): string
    {
        $query = FakturPajak::with(['invoice.items']);
        if (!empty($fakturIds)) {
            $query->whereIn('id', $fakturIds);
        }

        $fakturs = $query->orderBy('id', 'asc')->get();

        $lines = [];
        // DJP e-Faktur Header FK Definition
        $lines[] = "FK,KD_JENIS_TRANSAKSI,FG_PENGGANTI,NOMOR_FAKTUR,MASA_PAJAK,TAHUN_PAJAK,TANGGAL_FAKTUR,NPWP,NAMA,ALAMAT_LENGKAP,JUMLAH_DPP,JUMLAH_PPN,JUMLAH_PPNBM,ID_KETERANGAN_TAMBAHAN,FG_UANG_MUKA,UANG_MUKA_DPP,UANG_MUKA_PPN,UANG_MUKA_PPNBM,REFERENSI,KODE_DOKUMEN_PENDUKUNG";
        $lines[] = "LT,NPWP,NAMA,JALAN,BLOK,NOMOR,RT,RW,KECAMATAN,KELURAHAN,KABUPATEN,PROPINSI,KODE_POS,NOMOR_TELEPON";
        $lines[] = "OF,KODE_OBJEK,NAMA,HARGA_SATUAN,JUMLAH_BARANG,HARGA_TOTAL,DISKON,DPP,PPN,TARIF_PPNBM,PPNBM";

        foreach ($fakturs as $faktur) {
            // Clean NSFP numbers
            $cleanNsfp = preg_replace('/[^0-9]/', '', $faktur->nsfp_number);
            $cleanNpwp = preg_replace('/[^0-9]/', '', $faktur->buyer_npwp ?: '000000000000000');
            $fakturDateFormatted = Carbon::parse($faktur->faktur_date)->format('d/m/Y');
            
            // FK row
            $lines[] = implode(',', [
                'FK',
                $faktur->transaction_code, // 01
                '0', // 0 = Faktur Normal, 1 = Pengganti
                '"' . $cleanNsfp . '"',
                $faktur->tax_period_month,
                $faktur->tax_period_year,
                $fakturDateFormatted,
                '"' . $cleanNpwp . '"',
                '"' . str_replace('"', '""', $faktur->buyer_name) . '"',
                '"' . str_replace('"', '""', $faktur->buyer_address) . '"',
                round($faktur->dpp_amount),
                round($faktur->ppn_amount),
                0, // PPNBM
                '', // Keterangan tambahan
                0, // FG Uang Muka
                0, 0, 0,
                '"' . ($faktur->invoice?->invoice_number ?? '') . '"',
                ''
            ]);

            // OF (Objek Faktur) rows
            if ($faktur->invoice && $faktur->invoice->items->count() > 0) {
                foreach ($faktur->invoice->items as $item) {
                    $itemAmount = round((float)$item->amount);
                    $itemPpn = round($itemAmount * ($faktur->ppn_percentage / 100));
                    $lines[] = implode(',', [
                        'OF',
                        '000000',
                        '"' . str_replace('"', '""', $item->item_description) . '"',
                        round((float)$item->unit_price),
                        (float)$item->quantity,
                        $itemAmount,
                        0, // Diskon
                        $itemAmount, // DPP
                        $itemPpn, // PPN
                        0, // Tarif PPnBM
                        0 // PPnBM
                    ]);
                }
            } else {
                $lines[] = implode(',', [
                    'OF',
                    '000000',
                    '"Penyerahan Jasa Kena Pajak"',
                    round($faktur->dpp_amount),
                    1,
                    round($faktur->dpp_amount),
                    0,
                    round($faktur->dpp_amount),
                    round($faktur->ppn_amount),
                    0,
                    0
                ]);
            }
        }

        return implode("\r\n", $lines);
    }
}
