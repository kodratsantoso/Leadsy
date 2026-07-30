<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $documentTitle }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.5;
            font-size: 12px;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: right;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #6366f1;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 10px;
        }
        .section-title {
            background-color: #f3f4f6;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 25px;
            margin-bottom: 15px;
            border-left: 4px solid #6366f1;
        }
        .info-table, .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            padding: 5px 0;
            vertical-align: top;
        }
        .info-table td.label {
            font-weight: bold;
            width: 30%;
        }
        .data-table th, .data-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            text-align: left;
        }
        .data-table th {
            background-color: #f9fafb;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: #4b5563;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { font-weight: bold; background-color: #f3f4f6; }
        
        .page-break { page-break-after: always; }
        
        .signature-block {
            margin-top: 40px;
            width: 100%;
        }
        .signature-col {
            width: 45%;
            display: inline-block;
            vertical-align: top;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            margin-top: 40px;
            margin-bottom: 10px;
        }
        
        .footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            height: 30px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
    </style>
</head>
<body>

<div class="header">
    <h1>{{ $documentTitle }}</h1>
    <p>Estimation Number: {{ $estimation->estimation_number }} | Date: {{ \Carbon\Carbon::parse($estimation->created_at)->format('d M Y') }}</p>
</div>

<div class="section-title">Project Overview</div>
<table class="info-table">
    <tr>
        <td class="label">Customer Name:</td>
        <td>{{ $lead ? $lead->company_name : 'N/A' }}</td>
    </tr>
    <tr>
        <td class="label">Project Title:</td>
        <td>{{ $estimation->title }}</td>
    </tr>
    <tr>
        <td class="label">Service Category:</td>
        <td>{{ $estimation->category ? $estimation->category->name : 'N/A' }}</td>
    </tr>
    <tr>
        <td class="label">Complexity:</td>
        <td>{{ $estimation->complexityLevel ? $estimation->complexityLevel->name : 'N/A' }}</td>
    </tr>
</table>

<div class="section-title">Scope of Work</div>
<table class="info-table">
    <tr>
        <td class="label">Assumptions:</td>
        <td>{{ $estimation->assumptions ?? 'None specified' }}</td>
    </tr>
    <tr>
        <td class="label">Out of Scope:</td>
        <td>{{ $estimation->out_of_scope ?? 'None specified' }}</td>
    </tr>
    <tr>
        <td class="label">Dependencies:</td>
        <td>{{ $estimation->dependencies ?? 'None specified' }}</td>
    </tr>
    <tr>
        <td class="label">Risks:</td>
        <td>{{ $estimation->risks ?? 'None specified' }}</td>
    </tr>
</table>

@if($includeTaskBreakdown)
    <div class="page-break"></div>
    <div class="section-title">Task & Subtask Breakdown</div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 25%">Task / Subtask</th>
                <th style="width: 40%">Description & Deliverable</th>
                <th style="width: 20%">Role</th>
                <th style="width: 15%" class="text-right">ManDays</th>
            </tr>
        </thead>
        <tbody>
            @foreach($lines as $groupId => $groupLines)
                @php
                    $group = $groupLines->first()->taskGroup;
                @endphp
                <tr>
                    <td colspan="4" style="background-color: #e5e7eb; font-weight: bold;">
                        {{ $group ? $group->name : 'General Tasks' }}
                    </td>
                </tr>
                @foreach($groupLines as $line)
                    <tr>
                        <td>
                            <strong>{{ $line->task_name }}</strong><br>
                            <span style="color: #666; font-size: 10px;">{{ $line->subtask_name }}</span>
                        </td>
                        <td>
                            {{ $line->description }}
                            @if($line->deliverable)
                                <div style="margin-top: 4px; font-size: 10px; color: #4f46e5;"><strong>Deliverable:</strong> {{ $line->deliverable }}</div>
                            @endif
                        </td>
                        <td>{{ $line->role ? $line->role->name : 'N/A' }}</td>
                        <td class="text-right">{{ number_format($line->final_mandays, 1) }}</td>
                    </tr>
                @endforeach
            @endforeach
        </tbody>
    </table>
@endif

@if($includeCommercial)
    <div class="section-title">Commercial Summary</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Role</th>
                <th class="text-right">ManDays</th>
                <th class="text-right">Allocation (%)</th>
                <th class="text-right">Estimated Fee</th>
            </tr>
        </thead>
        <tbody>
            @php $totalFee = 0; $totalMandays = 0; @endphp
            @foreach($roleBreakdown as $roleData)
                @php 
                    $totalFee += $roleData['fee'];
                    $totalMandays += $roleData['mandays'];
                @endphp
                <tr>
                    <td>{{ $roleData['role'] }}</td>
                    <td class="text-right">{{ number_format($roleData['mandays'], 1) }}</td>
                    <td class="text-right">{{ $roleData['percentage'] }}%</td>
                    <td class="text-right">{{ $estimation->currency_code }} {{ number_format($roleData['fee'], 2) }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td class="text-right">Total</td>
                <td class="text-right">{{ number_format($totalMandays, 1) }}</td>
                <td class="text-right">100%</td>
                <td class="text-right">{{ $estimation->currency_code }} {{ number_format($totalFee, 2) }}</td>
            </tr>
        </tbody>
    </table>
@endif

<div class="page-break"></div>

<div class="section-title">Acceptance & Signature</div>
<p>By signing below, both parties agree to the scope and terms outlined in this document. Any changes to the scope of work described herein must be submitted via a formal Change Request and may affect the timeline and estimated commercial value.</p>

<div class="signature-block">
    <div class="signature-col" style="margin-right: 5%;">
        <strong>For Customer:</strong><br>
        {{ $lead ? $lead->company_name : 'Customer Company' }}
        <div class="signature-line"></div>
        Name:<br>
        Title:<br>
        Date:
    </div>
    
    <div class="signature-col">
        <strong>For Leadsy:</strong><br>
        Leadsy Inc.
        <div class="signature-line"></div>
        Name:<br>
        Title:<br>
        Date:
    </div>
</div>

<div class="footer">
    Generated by Leadsy Professional Services Module | Document Reference: {{ $estimation->estimation_number }}
</div>

</body>
</html>
