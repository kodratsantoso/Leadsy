<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentTitle }} - {{ $documentNumber }}</title>
    <style>
        @page {
            margin: 1.2cm 1.2cm 1.2cm 1.2cm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1f2937;
            line-height: 1.4;
            font-size: 11px;
            margin: 0;
            padding: 0;
        }
        /* Header section */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .header-table td {
            vertical-align: middle;
            padding: 0;
        }
        .logos-container {
            width: 60%;
        }
        .logo-img {
            max-height: 48px;
            max-width: 150px;
            vertical-align: middle;
        }
        .logo-divider {
            display: inline-block;
            width: 1px;
            height: 35px;
            background-color: #d1d5db;
            margin: 0 15px;
            vertical-align: middle;
        }
        .doc-title-container {
            width: 40%;
            text-align: right;
        }
        .doc-title {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-badge {
            display: inline-block;
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 4px;
            margin-top: 5px;
        }

        /* Cards layout */
        .cards-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
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
            padding: 12px 15px;
            min-height: 100px;
        }
        .card-left {
            margin-right: 10px;
        }
        .card-right {
            margin-left: 10px;
        }
        .card-title-bar {
            background-color: #1e40af;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            display: inline-block;
        }
        .info-row {
            margin-bottom: 5px;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            width: 70px;
            display: inline-block;
        }
        .info-value {
            color: #0f172a;
        }

        /* Data table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
        }
        .data-table th {
            background-color: #1e40af;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            font-size: 10px;
            text-transform: uppercase;
        }
        .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10px;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* Totals section */
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .totals-table td {
            padding: 0;
            vertical-align: top;
        }
        .totals-right {
            width: 250px;
            float: right;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background-color: #f8fafc;
        }
        .totals-row {
            width: 100%;
            border-bottom: 1px solid #e2e8f0;
            padding: 6px 10px;
            box-sizing: border-box;
        }
        .totals-row:last-child {
            border-bottom: none;
            background-color: #1e40af;
            color: #ffffff;
            font-weight: bold;
        }
        .totals-label {
            float: left;
            color: #475569;
        }
        .totals-row:last-child .totals-label {
            color: #ffffff;
        }
        .totals-val {
            float: right;
            text-align: right;
            font-weight: 600;
        }

        /* Section header */
        .section-header-bar {
            background-color: #1e40af;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            display: inline-block;
        }

        /* Terms & conditions */
        .terms-section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 15px;
            margin-bottom: 20px;
            background-color: #ffffff;
        }
        .terms-content {
            font-size: 9.5px;
            color: #334155;
            white-space: pre-wrap;
        }

        /* Bank Information */
        .bank-section {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 15px;
            margin-bottom: 30px;
        }
        .bank-details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .bank-details-table td {
            padding: 2px 0;
            font-size: 10px;
        }

        /* Signatures block */
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
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
            padding-top: 5px;
        }
        .sig-space {
            height: 65px;
            vertical-align: middle;
            text-align: center;
        }
        .sig-image {
            max-height: 60px;
            max-width: 180px;
        }
        .sig-title {
            font-weight: bold;
            color: #0f172a;
        }
        .sig-company {
            font-size: 10px;
            color: #475569;
            margin-bottom: 10px;
        }
        .sig-position {
            font-size: 9px;
            color: #64748b;
        }
    </style>
</head>
<body>

    <!-- Header Section -->
    <table class="header-table">
        <tr>
            <td class="logos-container">
                @if($issuerLogo && file_exists($issuerLogo))
                    <img src="{{ $issuerLogo }}" class="logo-img" alt="Issuer Brand">
                @else
                    <span style="font-weight: bold; font-size: 16px; color: #1e40af;">{{ $tenant->brand_name ?: $tenant->name }}</span>
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
                    <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #0f172a;">{{ $customerName }}</div>
                    <div style="color: #475569; font-size: 9.5px; margin-bottom: 6px;">{{ $customerAddress }}</div>
                    <div style="font-size: 9.5px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                        <span style="color: #64748b;">PIC:</span> <span style="font-weight: 600;">{{ $customerPicName }}</span>
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
                <th style="width: 45%;">Product Description</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: center;">Period</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 10%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td>
                        <div style="font-weight: bold; color: #0f172a;">{{ $item->item_name }}</div>
                        @if($item->description)
                            <div style="color: #64748b; font-size: 9px; margin-top: 2px;">{!! nl2br(e($item->description)) !!}</div>
                        @endif
                    </td>
                    <td style="text-align: right;">
                        {{ $currency }} {{ number_format($item->unit_price, 0, ',', '.') }}
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
                    <td style="text-align: right; font-weight: 600;">
                        {{ $currency }} {{ number_format($item->line_total_before_wht, 0, ',', '.') }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals & Summary -->
    <table class="totals-table">
        <tr>
            <td style="width: 50%;">
                <!-- Left blank / placeholder for notes if any -->
            </td>
            <td style="width: 50%;">
                <div class="totals-right">
                    <div class="totals-row">
                        <span class="totals-label">Subtotal</span>
                        <span class="totals-val">{{ $currency }} {{ number_format($subtotal, 0, ',', '.') }}</span>
                        <div style="clear: both;"></div>
                    </div>
                    @if($discount > 0)
                    <div class="totals-row">
                        <span class="totals-label">Discount</span>
                        <span class="totals-val">-{{ $currency }} {{ number_format($discount, 0, ',', '.') }}</span>
                        <div style="clear: both;"></div>
                    </div>
                    @endif
                    <div class="totals-row">
                        <span class="totals-label">VAT (11%)</span>
                        <span class="totals-val">{{ $currency }} {{ number_format($tax, 0, ',', '.') }}</span>
                        <div style="clear: both;"></div>
                    </div>
                    @if($wht > 0)
                    <div class="totals-row">
                        <span class="totals-label">WHT</span>
                        <span class="totals-val">-{{ $currency }} {{ number_format($wht, 0, ',', '.') }}</span>
                        <div style="clear: both;"></div>
                    </div>
                    @endif
                    <div class="totals-row">
                        <span class="totals-label">Total</span>
                        <span class="totals-val">{{ $currency }} {{ number_format($total, 0, ',', '.') }}</span>
                        <div style="clear: both;"></div>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Terms & Conditions Section -->
    @if($terms)
        <span class="section-header-bar">Terms and Conditions</span>
        <div class="terms-section">
            <div class="terms-content">{!! e($terms) !!}</div>
        </div>
    @endif

    <!-- Payment Information -->
    @if($bankAccount)
        <span class="section-header-bar">Payment Information</span>
        <div class="bank-section">
            <table class="bank-details-table">
                <tr>
                    <td style="width: 25%; color: #64748b; font-weight: bold;">Bank Name</td>
                    <td style="width: 75%;">: {{ $bankAccount->bank_name }}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-weight: bold;">Account Number</td>
                    <td>: {{ $bankAccount->account_number }}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-weight: bold;">Account Name</td>
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
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 5px;">{{ $customerName }}</div>
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
                <div style="font-weight: bold; color: #0f172a; margin-bottom: 5px;">{{ $tenant->legal_name ?: $tenant->name }}</div>
                <div class="sig-space">
                    @if($issuerSignatoryImage && file_exists($issuerSignatoryImage))
                        <img src="{{ $issuerSignatoryImage }}" class="sig-image" alt="Signature">
                    @endif
                </div>
                <div class="sig-container">
                    <div class="sig-title">{{ $tenant->signatory_name ?: 'Authorized Signatory' }}</div>
                    <div class="sig-position">{{ $tenant->signatory_position ?: 'Management' }}</div>
                </div>
            </td>
        </tr>
    </table>

</body>
</html>
