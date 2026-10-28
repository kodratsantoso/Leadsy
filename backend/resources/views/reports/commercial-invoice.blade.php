<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAKTUR PENAGIHAN - {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 28px;
        }
        .company-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }
        .company-sub {
            color: #64748b;
            font-size: 12px;
            margin-top: 4px;
        }
        .invoice-title {
            text-align: right;
        }
        .invoice-title h1 {
            font-size: 26px;
            margin: 0;
            color: #2563eb;
            font-weight: 800;
        }
        .invoice-number {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-top: 4px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 30px;
        }
        .meta-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
        }
        .meta-box h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
        }
        .table th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 10px 14px;
            font-size: 12px;
            text-transform: uppercase;
        }
        .table td {
            padding: 12px 14px;
            border-bottom: 1px solid #e2e8f0;
        }
        .table .text-right {
            text-align: right;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-table {
            width: 320px;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 6px 12px;
        }
        .totals-table .grand-total {
            border-top: 2px solid #0f172a;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            padding-top: 10px;
        }
        .payment-box {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 30px;
        }
        .payment-box h4 {
            margin: 0 0 8px 0;
            color: #1e40af;
            font-size: 13px;
        }
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            padding-top: 20px;
        }
        .sig-block {
            text-align: center;
        }
        .sig-space {
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #059669;
            font-weight: 700;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            margin: 10px 0;
            background: #f0fdf4;
        }
        .sig-name {
            font-weight: 700;
            color: #0f172a;
        }
        .sig-title {
            font-size: 12px;
            color: #64748b;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge-paid { background: #dcfce7; color: #15803d; }
        .badge-draft { background: #f1f5f9; color: #475569; }
        .badge-partially_paid { background: #fef3c7; color: #b45309; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company-title">PT VIRTUE DIGITAL ENTERPRISE</div>
            <div class="company-sub">
                Enterprise Cloud & AI Solutions<br>
                Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan, 12190<br>
                NPWP: 01.234.567.8-012.000
            </div>
        </div>
        <div class="invoice-title">
            <h1>FAKTUR PENAGIHAN</h1>
            <div class="invoice-number">No: {{ $invoice->invoice_number }}</div>
            <div style="margin-top: 8px;">
                <span class="badge badge-{{ $invoice->status }}">STATUS: {{ strtoupper($invoice->status) }}</span>
            </div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-box">
            <h3>Ditagihkan Kepada (Bill To):</h3>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">{{ $invoice->lead?->company_name ?? 'Pelanggan Terhormat' }}</div>
            <div style="color: #64748b; margin-top: 4px;">
                {{ $invoice->lead?->address ?? 'Alamat Terdaftar' }}<br>
                PIC: {{ $invoice->lead?->contact_name ?? $invoice->lead?->name ?? 'Bagian Keuangan' }}<br>
                Email: {{ $invoice->lead?->email ?? '-' }} | Telp: {{ $invoice->lead?->phone ?? '-' }}
            </div>
        </div>

        <div class="meta-box">
            <h3>Detail Tagihan:</h3>
            <div class="meta-row">
                <span style="color: #64748b;">Tanggal Faktur:</span>
                <span style="font-weight: 600;">{{ $invoice->invoice_date?->format('d F Y') }}</span>
            </div>
            <div class="meta-row">
                <span style="color: #64748b;">Jatuh Tempo:</span>
                <span style="font-weight: 600; color: #dc2626;">{{ $invoice->due_date?->format('d F Y') }}</span>
            </div>
            <div class="meta-row">
                <span style="color: #64748b;">Syarat Pembayaran:</span>
                <span style="font-weight: 600;">{{ $invoice->payment_terms }}</span>
            </div>
            @if($invoice->psDocument)
            <div class="meta-row">
                <span style="color: #64748b;">Ref BAST:</span>
                <span style="font-weight: 600; color: #2563eb;">#{{ $invoice->psDocument->document_number }}</span>
            </div>
            @endif
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th style="width: 50px;">No</th>
                <th>Deskripsi Pekerjaan / Deliverable</th>
                <th class="text-right" style="width: 100px;">Kuantitas</th>
                <th class="text-right" style="width: 140px;">Harga Satuan (IDR)</th>
                <th class="text-right" style="width: 150px;">Jumlah (IDR)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($invoice->items as $idx => $item)
            <tr>
                <td>{{ $idx + 1 }}</td>
                <td>
                    <div style="font-weight: 600; color: #0f172a;">{{ $item->item_description }}</div>
                    <div style="font-size: 11px; color: #64748b;">Termin Pembayaran: {{ $invoice->milestone_name }} ({{ $invoice->milestone_percentage }}%)</div>
                </td>
                <td class="text-right">{{ number_format($item->quantity, 0) }} {{ $item->unit }}</td>
                <td class="text-right">{{ number_format($item->unit_price, 0, ',', '.') }}</td>
                <td class="text-right" style="font-weight: 600;">{{ number_format($item->amount, 0, ',', '.') }}</td>
            </tr>
            @empty
            <tr>
                <td>1</td>
                <td>
                    <div style="font-weight: 600;">{{ $invoice->milestone_name }}</div>
                </td>
                <td class="text-right">1 Termin</td>
                <td class="text-right">{{ number_format($invoice->subtotal, 0, ',', '.') }}</td>
                <td class="text-right" style="font-weight: 600;">{{ number_format($invoice->subtotal, 0, ',', '.') }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="totals-section">
        <table class="totals-table">
            <tr>
                <td style="color: #64748b;">Dasar Pengenaan Pajak (DPP):</td>
                <td class="text-right" style="font-weight: 600;">Rp {{ number_format($invoice->subtotal, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td style="color: #64748b;">PPN ({{ $invoice->tax_percentage }}%):</td>
                <td class="text-right" style="font-weight: 600;">Rp {{ number_format($invoice->tax_amount, 0, ',', '.') }}</td>
            </tr>
            @if($invoice->withholding_tax_amount > 0)
            <tr>
                <td style="color: #64748b;">PPh 23 ({{ $invoice->withholding_tax_percentage }}%):</td>
                <td class="text-right" style="color: #dc2626;">- Rp {{ number_format($invoice->withholding_tax_amount, 0, ',', '.') }}</td>
            </tr>
            @endif
            <tr class="grand-total">
                <td>Total Tagihan:</td>
                <td class="text-right">Rp {{ number_format($invoice->total_amount, 0, ',', '.') }}</td>
            </tr>
            @if($invoice->paid_amount > 0)
            <tr>
                <td style="color: #15803d; font-weight: 600;">Sudah Dibayar:</td>
                <td class="text-right" style="color: #15803d; font-weight: 700;">Rp {{ number_format($invoice->paid_amount, 0, ',', '.') }}</td>
            </tr>
            <tr style="font-weight: 700; color: #dc2626;">
                <td>Sisa Tagihan:</td>
                <td class="text-right">Rp {{ number_format(max(0, $invoice->total_amount - $invoice->paid_amount), 0, ',', '.') }}</td>
            </tr>
            @endif
        </table>
    </div>

    <div class="payment-box">
        <h4>Informasi Pembayaran / Rekening Bank:</h4>
        <div style="color: #334155; white-space: pre-line;">{!! nl2br(e($invoice->bank_details)) !!}</div>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">* Mohon cantumkan nomor faktur <strong>{{ $invoice->invoice_number }}</strong> pada berita transfer. Bukti transfer dapat diunggah ke portal Leadsy.</div>
    </div>

    <div class="signatures">
        <div class="sig-block">
            <div style="font-size: 12px; color: #64748b;">Diterima & Disetujui Oleh,</div>
            <div class="sig-space" style="color: #64748b; font-weight: normal; background: transparent;">
                Tanda Tangan & Cap Pelanggan
            </div>
            <div class="sig-name">{{ $invoice->lead?->company_name ?? 'Klien' }}</div>
            <div class="sig-title">Finance & Procurement</div>
        </div>

        <div class="sig-block">
            <div style="font-size: 12px; color: #64748b;">Diterbitkan Oleh,</div>
            <div class="sig-space">
                ✓ VERIFIED DIGITAL INVOICE<br>
                <span style="font-size: 10px; font-weight: normal; color: #059669;">PSrE Cryptographic Seal</span>
            </div>
            <div class="sig-name">Finance & Accounting Department</div>
            <div class="sig-title">PT Virtue Digital Enterprise</div>
        </div>
    </div>
</body>
</html>
