<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Faktur Pajak - {{ $nsfpNumber }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 8.5pt;
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .outer-border {
            border: 1.5px solid #000000;
            padding: 0;
        }
        .faktur-header {
            text-align: center;
            border-bottom: 1.5px solid #000000;
            padding: 10px 0;
            background-color: #f1f5f9;
        }
        .faktur-title {
            font-size: 15pt;
            font-weight: 800;
            letter-spacing: 2px;
            margin-bottom: 4px;
        }
        .nsfp-box {
            font-size: 10pt;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .section-table {
            width: 100%;
            border-collapse: collapse;
        }
        .section-header {
            background-color: #e2e8f0;
            font-weight: bold;
            font-size: 8.5pt;
            padding: 4px 8px;
            border-top: 1px solid #000000;
            border-bottom: 1px solid #000000;
        }
        .data-row td {
            padding: 3px 8px;
            vertical-align: top;
            font-size: 8.5pt;
        }
        .label-col {
            width: 25%;
            color: #1e293b;
        }
        .separator-col {
            width: 2%;
            text-align: center;
        }
        .value-col {
            width: 73%;
            font-weight: 600;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            border-top: 1.5px solid #000000;
            border-bottom: 1.5px solid #000000;
        }
        .items-table th {
            border-bottom: 1px solid #000000;
            border-right: 1px solid #000000;
            padding: 5px 6px;
            font-size: 8pt;
            text-align: center;
            background-color: #f8fafc;
        }
        .items-table th:last-child {
            border-right: none;
        }
        .items-table td {
            border-bottom: 1px solid #cbd5e1;
            border-right: 1px solid #000000;
            padding: 6px 8px;
            font-size: 8pt;
            vertical-align: top;
        }
        .items-table td:last-child {
            border-right: none;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .calc-summary-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1.5px solid #000000;
        }
        .calc-summary-table td {
            padding: 4px 8px;
            font-size: 8.5pt;
            border-bottom: 1px solid #cbd5e1;
        }
        .calc-summary-table tr:last-child td {
            border-bottom: none;
        }
        .calc-label {
            width: 70%;
        }
        .calc-val {
            width: 30%;
            text-align: right;
            font-weight: bold;
        }
        .footer-table {
            width: 100%;
            border-collapse: collapse;
            padding: 10px 14px;
        }
        .legal-notice {
            font-size: 7pt;
            color: #475569;
            font-style: italic;
            line-height: 1.3;
            width: 60%;
            vertical-align: bottom;
            padding: 10px 12px;
        }
        .sign-area {
            width: 40%;
            vertical-align: top;
            text-align: center;
            padding: 10px 12px;
        }
        .qr-placeholder {
            display: inline-block;
            border: 1px solid #94a3b8;
            padding: 4px;
            background: #ffffff;
            margin: 6px 0;
            font-size: 6.5pt;
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="outer-border">
        <!-- Header: FAKTUR PAJAK & NSFP -->
        <div class="faktur-header">
            <div class="faktur-title">FAKTUR PAJAK</div>
            <div class="nsfp-box">Kode dan Nomor Seri Faktur Pajak: {{ $nsfpNumber }}</div>
        </div>

        <!-- Section 1: Pengusaha Kena Pajak (Penjual) -->
        <div class="section-header">Pengusaha Kena Pajak</div>
        <table class="section-table">
            <tr class="data-row">
                <td class="label-col">Nama</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $sellerName }}</td>
            </tr>
            <tr class="data-row">
                <td class="label-col">Alamat</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $sellerAddress }}</td>
            </tr>
            <tr class="data-row">
                <td class="label-col">NPWP</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $sellerNpwp }}</td>
            </tr>
        </table>

        <!-- Section 2: Pembeli Barang Kena Pajak / Penerima Jasa Kena Pajak -->
        <div class="section-header">Pembeli Barang Kena Pajak / Penerima Jasa Kena Pajak</div>
        <table class="section-table">
            <tr class="data-row">
                <td class="label-col">Nama</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $buyerName }}</td>
            </tr>
            <tr class="data-row">
                <td class="label-col">Alamat</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $buyerAddress }}</td>
            </tr>
            <tr class="data-row">
                <td class="label-col">NPWP / NIK</td>
                <td class="separator-col">:</td>
                <td class="value-col">{{ $buyerNpwp ?: ($buyerNik ?: '00.000.000.0-000.000') }}</td>
            </tr>
        </table>

        <!-- Section 3: Rincian Barang / Jasa -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">No. Urut</th>
                    <th style="width: 65%;">Nama Barang Kena Pajak / Jasa Kena Pajak</th>
                    <th style="width: 30%;">Harga Jual / Penggantian / Uang Muka / Termin (Rp)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $idx => $item)
                <tr>
                    <td class="text-center">{{ $idx + 1 }}</td>
                    <td>
                        {{ $item['description'] }}
                        @if(!empty($invoiceRef))
                            <br><span style="font-size: 7pt; color: #475569;">Ref Invoice: {{ $invoiceRef }}</span>
                        @endif
                    </td>
                    <td class="text-right">{{ number_format($item['amount'], 2, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Section 4: Ringkasan Dasar Pengenaan Pajak & PPN -->
        <table class="calc-summary-table">
            <tr>
                <td class="calc-label">Harga Jual / Penggantian / Uang Muka / Termin</td>
                <td class="calc-val">Rp {{ number_format($dppAmount, 2, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="calc-label">Dikurangi Potongan Harga</td>
                <td class="calc-val">Rp 0,00</td>
            </tr>
            <tr>
                <td class="calc-label">Dikurangi Uang Muka yang telah diterima</td>
                <td class="calc-val">Rp 0,00</td>
            </tr>
            <tr>
                <td class="calc-label"><strong>Dasar Pengenaan Pajak (DPP)</strong></td>
                <td class="calc-val"><strong>Rp {{ number_format($dppAmount, 2, ',', '.') }}</strong></td>
            </tr>
            <tr>
                <td class="calc-label"><strong>PPN = {{ $ppnPercentage }}% x Dasar Pengenaan Pajak</strong></td>
                <td class="calc-val" style="color: #0f172a;"><strong>Rp {{ number_format($ppnAmount, 2, ',', '.') }}</strong></td>
            </tr>
            <tr>
                <td class="calc-label">Total Pajak Penjualan atas Barang Mewah (PPnBM)</td>
                <td class="calc-val">Rp 0,00</td>
            </tr>
        </table>

        <!-- Section 5: Legal Notice & Digital Signature -->
        <table class="footer-table">
            <tr>
                <td class="legal-notice">
                    Sesuai dengan ketentuan peraturan perundang-undangan perpajakan yang berlaku di Republik Indonesia (UU HPP & Peraturan Direktur Jenderal Pajak), Faktur Pajak ini telah ditandatangani secara elektronik sehingga tidak memerlukan tanda tangan basah dan cap stempel fisik.<br><br>
                    Kode Transaksi: <strong>{{ $transactionCode }}</strong> (Penyerahan BKP/JKP kepada selain Pemungut PPN)<br>
                    Masa Pajak: <strong>{{ str_pad($taxPeriodMonth, 2, '0', STR_PAD_LEFT) }} / {{ $taxPeriodYear }}</strong><br>
                    ID Approval DJP: {{ $approvalCode ?: 'E-FAKTUR-' . strtoupper(substr(md5($nsfpNumber), 0, 16)) }}
                </td>
                <td class="sign-area">
                    <div style="font-size: 8pt; margin-bottom: 2px;">Jakarta Selatan, {{ $fakturDate }}</div>
                    <div class="qr-placeholder">
                        <div style="font-weight: bold; color: #0284c7; padding: 4px;">[ QR CODE DJP ]</div>
                        <div style="font-size: 6pt; color: #64748b;">Validasi DJP e-Faktur</div>
                    </div>
                    <div style="font-size: 8.5pt; font-weight: bold; text-decoration: underline; margin-top: 4px;">{{ $sellerName }}</div>
                    <div style="font-size: 7.5pt; color: #64748b;">Kuasa Penandatangan Faktur Pajak Elektronik</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
