<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentTitle }} - {{ $documentNumber }}</title>
    <style>
        @page {
            margin: 0.8cm 1.0cm 0.8cm 1.0cm;
        }
        body {
            font-family: 'Verdana', Geneva, sans-serif;
            color: #1e293b;
            line-height: 1.4;
            font-size: 9.5px;
            margin: 0;
            padding: 0;
        }
        
        /* Top Blue Border Accent */
        .top-accent {
            height: 5px;
            background-color: #0f3d7a;
            margin-bottom: 15px;
        }
        
        /* Header section */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .header-table td {
            vertical-align: middle;
            padding: 0;
        }
        .logos-container {
            width: 55%;
        }
        .logo-img {
            max-height: 40px;
            max-width: 130px;
            vertical-align: middle;
        }
        .logo-divider {
            display: inline-block;
            width: 1px;
            height: 28px;
            background-color: #cbd5e1;
            margin: 0 10px;
            vertical-align: middle;
        }
        .doc-title-container {
            width: 45%;
            text-align: right;
        }
        .doc-title {
            font-size: 22px;
            font-weight: bold;
            color: #0f3d7a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-badge {
            display: inline-block;
            background-color: #0f3d7a;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 4px;
            margin-top: 5px;
        }

        /* Cards layout */
        .cards-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .cards-table td {
            width: 50%;
            vertical-align: top;
            padding: 0;
        }
        .card-inner {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            min-height: 90px;
        }
        .card-left {
            margin-right: 6px;
        }
        .card-right {
            margin-left: 6px;
        }
        .card-title-bar {
            background-color: #0f3d7a;
            color: #ffffff;
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 3px 6px;
            border-radius: 3px;
            margin-bottom: 6px;
            display: inline-block;
        }
        .info-row {
            margin-bottom: 3px;
            font-size: 9px;
        }
        .info-label {
            font-weight: bold;
            color: #475569;
            width: 80px;
            display: inline-block;
        }
        .info-value {
            color: #1e293b;
        }

        /* Data table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
        }
        .data-table th {
            background-color: #0f3d7a;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 6px 8px;
            font-size: 9px;
            text-transform: uppercase;
            border: 1px solid #0f3d7a;
        }
        .data-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 8.5px;
            color: #1e293b;
            vertical-align: top;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* Totals section */
        .totals-container-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .totals-inner-table {
            width: 250px;
            border-collapse: collapse;
            border: 1px solid #e2e8f0;
            background-color: #f8fafc;
        }
        .totals-inner-table td {
            padding: 5px 8px;
            font-size: 9px;
            border-bottom: 1px solid #e2e8f0;
        }
        .totals-inner-table tr:last-child td {
            border-bottom: none;
            background-color: #0f3d7a;
            color: #ffffff;
            font-weight: bold;
        }

        /* Section header */
        .section-header-bar {
            background-color: #0f3d7a;
            color: #ffffff;
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 3px 6px;
            border-radius: 3px;
            margin-bottom: 5px;
            display: inline-block;
        }

        /* Terms & conditions */
        .terms-section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 15px;
            background-color: #ffffff;
        }
        .terms-table {
            width: 100%;
            border-collapse: collapse;
        }
        .terms-bullet {
            width: 14px;
            vertical-align: top;
            font-size: 10px;
            color: #0f3d7a;
            padding: 2px 0;
        }
        .terms-text {
            font-size: 8.5px;
            color: #334155;
            line-height: 1.4;
            padding: 2px 0;
            vertical-align: top;
        }

        /* Bank Information */
        .bank-section {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 20px;
        }
        .bank-details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .bank-details-table td {
            padding: 2px 0;
            font-size: 8.5px;
        }

        /* Signatures block */
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding: 0;
        }
        .sig-container {
            border-top: 1px solid #cbd5e1;
            width: 200px;
            margin: 0 auto;
            padding-top: 4px;
            font-size: 9px;
        }
        .sig-space {
            height: 50px;
            vertical-align: middle;
            text-align: center;
        }
        .sig-image {
            max-height: 44px;
            max-width: 150px;
        }
        .sig-title {
            font-weight: bold;
            color: #1e293b;
        }
        .sig-company {
            font-size: 9px;
            color: #475569;
            margin-bottom: 6px;
        }
        .sig-position {
            font-size: 8px;
            color: #64748b;
            margin-top: 1px;
        }
    </style>
</head>
<body>

    <div class="top-accent"></div>

    <!-- Header Section -->
    <table class="header-table">
        <tr>
            <td class="logos-container">
                @if($issuerLogo && file_exists($issuerLogo))
                    <img src="{{ $issuerLogo }}" class="logo-img" alt="Issuer Brand">
                @else
                    <span style="font-weight: bold; font-size: 14px; color: #0f3d7a;">{{ $tenant->brand_name ?: $tenant->name }}</span>
                @endif

                @if($productLogo && file_exists($productLogo))
                    <span class="logo-divider"></span>
                    <img src="{{ $productLogo }}" class="logo-img" alt="Product Brand">
                @endif
            </td>
            <td class="doc-title-container">
                <h1 class="doc-title">{{ $documentTitle }}</h1>
                <div class="doc-badge">No. {{ $documentNumber }}</div>
            </td>
        </tr>
    </table>

    <!-- Cards Section -->
    <table class="cards-table">
        <tr>
            <td>
                <div class="card-inner card-left">
                    <span class="card-title-bar">Customer</span>
                    <div style="font-weight: bold; font-size: 10px; margin-bottom: 3px; color: #0f3d7a;">{{ $customerName }}</div>
                    <div style="color: #475569; font-size: 8.5px; margin-bottom: 5px; line-height: 1.25;">{{ $customerAddress }}</div>
                    <div style="font-size: 8.5px; border-top: 1px solid #e2e8f0; padding-top: 3px; margin-top: 3px;">
                        <span style="color: #64748b; font-weight: bold;">PIC:</span> <span style="font-weight: bold;">{{ $customerPicName }}</span>
                        @if($customerPicPosition)
                            <span style="color: #64748b;">({{ $customerPicPosition }})</span>
                        @endif
                    </div>
                </div>
            </td>
            <td>
                <div class="card-inner card-right">
                    <span class="card-title-bar">Document Information</span>
                    <div class="info-row">
                        <span class="info-label">Date</span>
                        <span class="info-value">: {{ $docDate }}</span>
                    </div>
                    @if($soDate)
                    <div class="info-row">
                        <span class="info-label">Sales Order</span>
                        <span class="info-value">: {{ $soDate }}</span>
                    </div>
                    @endif
                    <div class="info-row">
                        <span class="info-label">Valid Until</span>
                        <span class="info-value">: {{ $validUntil }}</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Items Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%; text-align: center;">No</th>
                <th style="width: 40%;">Product</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: center;">Period</th>
                <th style="width: 8%; text-align: center;">Qty</th>
                <th style="width: 8%; text-align: center;">Discount</th>
                <th style="width: 9%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td>
                        <div style="font-weight: bold; color: #0f3d7a;">{{ $item->item_name }}</div>
                        @if($item->description)
                            <div style="color: #64748b; font-size: 7.5px; margin-top: 1px;">{!! nl2br(e($item->description)) !!}</div>
                        @endif
                    </td>
                    <td style="text-align: right;">
                        {{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($item->unit_price, 0, ',', '.') }}
                    </td>
                    <td style="text-align: center;">
                        @if($item->duration_value && $item->duration_unit)
                            {{ $item->duration_value }} {{ ucfirst($item->duration_unit) }}
                        @else
                            -
                        @endif
                    </td>
                    <td style="text-align: center;">
                        {{ number_format($item->quantity, 0) }} {{ $item->unit ?: 'User' }}
                    </td>
                    <td style="text-align: center; color: #475569;">
                        @if(($item->line_discount_amount ?? 0) > 0)
                            {{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($item->line_discount_amount, 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    <td style="text-align: right; font-weight: bold; color: #0f3d7a;">
                        {{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($item->line_total_before_wht, 0, ',', '.') }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals Table (Nested layout to avoid overlap/floats in DomPDF) -->
    <table class="totals-container-table">
        <tr>
            <td style="width: 55%; border: none;"></td>
            <td style="width: 45%; border: none; text-align: right;">
                <table class="totals-inner-table" style="display: inline-table; text-align: left;">
                    <tr>
                        <td style="color: #475569;">Subtotal</td>
                        <td style="text-align: right; font-weight: bold;">{{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($subtotal, 0, ',', '.') }}</td>
                    </tr>
                    @if($discount > 0)
                    <tr>
                        <td style="color: #475569;">Discount</td>
                        <td style="text-align: right; font-weight: bold; color: #dc2626;">-{{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($discount, 0, ',', '.') }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="color: #475569;">VAT (11%)</td>
                        <td style="text-align: right; font-weight: bold;">{{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($tax, 0, ',', '.') }}</td>
                    </tr>
                    @if($wht > 0)
                    <tr>
                        <td style="color: #475569;">WHT</td>
                        <td style="text-align: right; font-weight: bold; color: #dc2626;">-{{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($wht, 0, ',', '.') }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="font-weight: bold; color: #ffffff;">Total</td>
                        <td style="text-align: right; font-weight: bold; color: #ffffff;">{{ $currency === 'IDR' ? 'Rp.' : $currency }} {{ number_format($total, 0, ',', '.') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Terms & Conditions Section -->
    @if($terms)
        <span class="section-header-bar">Terms and Conditions</span>
        <div class="terms-section">
            <table class="terms-table">
                @foreach(explode("\n", str_replace("\r", "", $terms)) as $line)
                    @if(trim($line))
                        <tr>
                            <td class="terms-bullet">✦</td>
                            <td class="terms-text">{!! e(ltrim(trim($line), "\t-*•. ")) !!}</td>
                        </tr>
                    @endif
                @endforeach
            </table>
        </div>
    @endif

    <!-- Payment Information -->
    @if($bankAccount)
        <span class="section-header-bar">Payment Information</span>
        <div class="bank-section">
            <table class="bank-details-table">
                <tr>
                    <td style="width: 25%; color: #475569; font-weight: bold;">Bank Name</td>
                    <td style="width: 75%;">: {{ $bankAccount->bank_name }}</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-weight: bold;">Account Number</td>
                    <td>: {{ $bankAccount->account_number }}</td>
                </tr>
                <tr>
                    <td style="color: #475569; font-weight: bold;">Account Name</td>
                    <td>: {{ $bankAccount->account_name }}</td>
                </tr>
            </table>
        </div>
    @endif

    <!-- Signatures -->
    <table class="signatures-table">
        <tr>
            <!-- Customer Signatory -->
            <td>
                <div class="sig-company">Confirmed by Customer,</div>
                <div style="font-weight: bold; color: #0f3d7a; margin-bottom: 4px;">{{ $customerName }}</div>
                <div class="sig-space">
                    <!-- Blank area for customer physical signature -->
                </div>
                <div class="sig-container">
                    <div class="sig-title">{{ $customerPicName }}</div>
                    <div class="sig-position">{{ $customerPicPosition ?: 'Authorized Representative' }}</div>
                </div>
            </td>
            <!-- Issuer Signatory -->
            <td>
                <div class="sig-company">Approved by,</div>
                <div style="font-weight: bold; color: #0f3d7a; margin-bottom: 4px;">{{ $tenant->legal_name ?: $tenant->name }}</div>
                <div class="sig-space">
                    @if($issuerSignatoryImage && file_exists($issuerSignatoryImage))
                        <img src="{{ $issuerSignatoryImage }}" class="sig-image" alt="Signature">
                    @endif
                </div>
                <div class="sig-container">
                    <div class="sig-title">{{ $issuerSignatoryName }}</div>
                    <div class="sig-position">{{ $issuerSignatoryPosition }}</div>
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
