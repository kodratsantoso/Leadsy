<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $docTitle }} - {{ $invoiceNumber }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 18mm 16mm 20mm 16mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9.5pt;
            line-height: 1.45;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
        }
        .header-logo {
            width: 50%;
            vertical-align: top;
        }
        .header-meta {
            width: 50%;
            vertical-align: top;
            text-align: right;
        }
        .company-name {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 4px;
        }
        .company-details {
            font-size: 8pt;
            color: #64748b;
            line-height: 1.35;
            margin-top: 2px;
        }
        .doc-title {
            font-size: 20pt;
            font-weight: 800;
            color: #0284c7;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-col {
            width: 50%;
            vertical-align: top;
        }
        .card-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-right: 8px;
        }
        .card-box-right {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-left: 8px;
        }
        .card-heading {
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #0284c7;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
        }
        .meta-table td {
            padding: 2.5px 0;
            vertical-align: top;
        }
        .meta-label {
            color: #64748b;
            width: 40%;
        }
        .meta-val {
            color: #0f172a;
            font-weight: 600;
            width: 60%;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #0f172a;
        }
        .items-table td {
            font-size: 8.5pt;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            border-left: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            vertical-align: top;
        }
        .items-table tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .summary-wrapper {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .summary-left {
            width: 55%;
            vertical-align: top;
            padding-right: 15px;
        }
        .summary-right {
            width: 45%;
            vertical-align: top;
        }
        .calc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        }
        .calc-table td {
            padding: 6px 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .calc-table tr.total-row td {
            background-color: #0284c7;
            color: #ffffff;
            font-size: 10pt;
            font-weight: bold;
            border-bottom: none;
        }
        .bank-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-top: 5px;
        }
        .bank-title {
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #166534;
            margin-bottom: 4px;
        }
        .bank-content {
            font-size: 8pt;
            color: #1e293b;
            line-height: 1.4;
        }
        .signatures {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        .sign-col {
            width: 45%;
            vertical-align: top;
            text-align: center;
        }
        .sign-line {
            width: 180px;
            margin: 60px auto 4px auto;
            border-bottom: 1px solid #0f172a;
        }
        .badge-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-paid { background: #dcfce7; color: #15803d; }
        .status-unpaid { background: #fee2e2; color: #b91c1c; }
        .status-draft { background: #f1f5f9; color: #475569; }
        .terbilang-box {
            font-size: 8pt;
            font-style: italic;
            color: #475569;
            background: #fff;
            border: 1px dashed #cbd5e1;
            padding: 6px 10px;
            border-radius: 4px;
            margin-top: 8px;
        }
    </style>
</head>
<body>

    <!-- Header Section -->
    <table class="header-table">
        <tr>
            <td class="header-logo">
                @if(!empty($logoBase64))
                    <img src="{{ $logoBase64 }}" alt="Logo" style="max-height: 50px; max-width: 180px;">
                @endif
                <div class="company-name">{{ $tenantName }}</div>
                <div class="company-details">
                    NPWP: {{ $tenantNpwp }}<br>
                    {{ $tenantAddress }}<br>
                    Email: {{ $tenantEmail }} | Telp: {{ $tenantPhone }}
                </div>
            </td>
            <td class="header-meta">
                <div class="doc-title">INVOICE</div>
                <div style="font-size: 11pt; font-weight: bold; color: #0f172a;"># {{ $invoiceNumber }}</div>
                <div style="margin-top: 4px;">
                    <span class="badge-status {{ $statusClass }}">{{ strtoupper($invoiceStatus) }}</span>
                </div>
            </td>
        </tr>
    </table>

    <!-- Info Grid: Bill To & Document Info -->
    <table class="info-grid">
        <tr>
            <td class="info-col">
                <div class="card-box">
                    <div class="card-heading">DITAGIHKAN KEPADA (BILL TO)</div>
                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">Nama Perusahaan:</td>
                            <td class="meta-val">{{ $customerName }}</td>
                        </tr>
                        @if(!empty($customerAddress))
                        <tr>
                            <td class="meta-label">Alamat:</td>
                            <td class="meta-val">{{ $customerAddress }}</td>
                        </tr>
                        @endif
                        @if(!empty($customerPic))
                        <tr>
                            <td class="meta-label">Kontak / PIC:</td>
                            <td class="meta-val">{{ $customerPic }}</td>
                        </tr>
                        @endif
                        @if(!empty($customerNpwp))
                        <tr>
                            <td class="meta-label">NPWP / NIK:</td>
                            <td class="meta-val">{{ $customerNpwp }}</td>
                        </tr>
                        @endif
                    </table>
                </div>
            </td>
            <td class="info-col">
                <div class="card-box-right">
                    <div class="card-heading">INFORMASI FAKTUR</div>
                    <table class="meta-table">
                        <tr>
                            <td class="meta-label">Tanggal Faktur:</td>
                            <td class="meta-val">{{ $invoiceDate }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Jatuh Tempo:</td>
                            <td class="meta-val" style="color: #b91c1c;">{{ $dueDate }}</td>
                        </tr>
                        <tr>
                            <td class="meta-label">Payment Terms:</td>
                            <td class="meta-val">{{ $paymentTerms }}</td>
                        </tr>
                        @if(!empty($salesOrderRef))
                        <tr>
                            <td class="meta-label">No. Sales Order:</td>
                            <td class="meta-val">{{ $salesOrderRef }}</td>
                        </tr>
                        @endif
                        @if(!empty($customerPoNumber))
                        <tr>
                            <td class="meta-label">No. PO Pelanggan:</td>
                            <td class="meta-val">{{ $customerPoNumber }}</td>
                        </tr>
                        @endif
                        @if(!empty($nsfpNumber))
                        <tr>
                            <td class="meta-label">No. Seri Faktur Pajak:</td>
                            <td class="meta-val" style="color: #0284c7;">{{ $nsfpNumber }}</td>
                        </tr>
                        @endif
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;" class="text-center">No</th>
                <th style="width: 50%;">Deskripsi Tagihan / Layanan</th>
                <th style="width: 10%;" class="text-center">Kuantitas</th>
                <th style="width: 15%;" class="text-right">Harga Satuan (IDR)</th>
                <th style="width: 20%;" class="text-right">Jumlah (IDR)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $idx => $item)
            <tr>
                <td class="text-center">{{ $idx + 1 }}</td>
                <td>
                    <strong>{{ $item['description'] }}</strong>
                    @if(!empty($item['notes']))
                        <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">{{ $item['notes'] }}</div>
                    @endif
                </td>
                <td class="text-center">{{ $item['quantity'] }} {{ $item['unit'] ?? 'Unit' }}</td>
                <td class="text-right">{{ number_format($item['unit_price'], 0, ',', '.') }}</td>
                <td class="text-right font-semibold">{{ number_format($item['amount'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Summary & Bank Details Section -->
    <table class="summary-wrapper">
        <tr>
            <td class="summary-left">
                <!-- Payment Bank Account Instruction -->
                <div class="bank-box">
                    <div class="bank-title">INSTRUKSI PEMBAYARAN REKENING RESMI</div>
                    <div class="bank-content">
                        Mohon pembayaran ditransfer penuh ke rekening resmi berikut:<br>
                        <strong>{{ $bankName }}</strong><br>
                        Nomor Rekening: <strong>{{ $bankAccountNumber }}</strong><br>
                        Atas Nama: <strong>{{ $bankAccountHolder }}</strong>
                    </div>
                </div>

                @if(!empty($notes))
                <div style="margin-top: 10px; font-size: 8pt; color: #475569;">
                    <strong>Catatan:</strong><br>
                    {!! nl2br(e($notes)) !!}
                </div>
                @endif

                @if(!empty($terbilang))
                <div class="terbilang-box">
                    <strong>Terbilang:</strong> {{ $terbilang }} Rupiah
                </div>
                @endif
            </td>
            <td class="summary-right">
                <table class="calc-table">
                    <tr>
                        <td style="color: #64748b;">Subtotal (DPP)</td>
                        <td class="text-right font-semibold">Rp {{ number_format($subtotal, 0, ',', '.') }}</td>
                    </tr>
                    @if($discountAmount > 0)
                    <tr>
                        <td style="color: #64748b;">Diskon</td>
                        <td class="text-right font-semibold text-red-600">- Rp {{ number_format($discountAmount, 0, ',', '.') }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="color: #64748b;">PPN ({{ $taxPercentage }}%)</td>
                        <td class="text-right font-semibold">Rp {{ number_format($taxAmount, 0, ',', '.') }}</td>
                    </tr>
                    @if($withholdingTaxAmount > 0)
                    <tr>
                        <td style="color: #64748b;">PPh 23 Dipotong ({{ $withholdingTaxPercentage }}%)</td>
                        <td class="text-right font-semibold" style="color: #b91c1c;">- Rp {{ number_format($withholdingTaxAmount, 0, ',', '.') }}</td>
                    </tr>
                    @endif
                    <tr class="total-row">
                        <td>TOTAL DITAGIHKAN</td>
                        <td class="text-right">Rp {{ number_format($totalAmount, 0, ',', '.') }}</td>
                    </tr>
                    @if($paidAmount > 0)
                    <tr>
                        <td style="color: #15803d; font-weight: 600;">Jumlah Telah Dibayar</td>
                        <td class="text-right font-semibold" style="color: #15803d;">Rp {{ number_format($paidAmount, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td style="color: #b91c1c; font-weight: 600;">Sisa Tagihan</td>
                        <td class="text-right font-bold" style="color: #b91c1c;">Rp {{ number_format(max(0, $totalAmount - $paidAmount), 0, ',', '.') }}</td>
                    </tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>

    <!-- Signature Section -->
    <table class="signatures">
        <tr>
            <td class="sign-col">
                <div style="font-size: 8pt; color: #64748b; margin-bottom: 4px;">Diterima oleh Pelanggan,</div>
                <div class="sign-line"></div>
                <div style="font-size: 8.5pt; font-weight: bold; color: #0f172a;">{{ $customerPic ?: 'Penerima / Customer' }}</div>
                <div style="font-size: 7.5pt; color: #64748b;">{{ $customerName }}</div>
            </td>
            <td style="width: 10%;"></td>
            <td class="sign-col">
                <div style="font-size: 8pt; color: #64748b; margin-bottom: 4px;">Hormat kami, Finance & Billing,</div>
                <div class="sign-line"></div>
                <div style="font-size: 8.5pt; font-weight: bold; color: #0f172a;">Finance & Accounting Dept.</div>
                <div style="font-size: 7.5pt; color: #64748b;">{{ $tenantName }}</div>
            </td>
        </tr>
    </table>

</body>
</html>
