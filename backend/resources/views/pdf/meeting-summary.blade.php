<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Summary - {{ $documentId }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .cover-page {
            border-bottom: 3px solid #6366f1;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }
        .cover-page h1 {
            font-size: 32px;
            color: #0f172a;
            margin: 0 0 10px 0;
            font-weight: 700;
            letter-spacing: -0.025em;
        }
        .meeting-type-badge {
            display: inline-block;
            background-color: #e0e7ff;
            color: #4f46e5;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 20px;
        }
        .metadata-grid {
            display: table;
            width: 100%;
            margin-top: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        .metadata-row {
            display: table-row;
        }
        .metadata-col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            font-size: 14px;
            color: #475569;
        }
        .metadata-col strong {
            color: #0f172a;
        }
        .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 18px;
            color: #0f172a;
            margin: 0 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #f1f5f9;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 20px;
        }
        .text-content {
            font-size: 14px;
            margin: 0;
            color: #334155;
            line-height: 1.6;
        }
        .list-items {
            margin: 0;
            padding-left: 20px;
        }
        .list-items li {
            font-size: 14px;
            color: #334155;
            margin-bottom: 8px;
            line-height: 1.6;
        }
        .grid-table {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }
        .grid-row {
            display: table-row;
            border-bottom: 1px solid #f1f5f9;
        }
        .grid-row:last-child {
            border-bottom: none;
        }
        .grid-cell-label {
            display: table-cell;
            padding: 12px 10px;
            font-size: 14px;
            font-weight: 600;
            color: #475569;
            width: 30%;
            vertical-align: top;
        }
        .grid-cell-value {
            display: table-cell;
            padding: 12px 10px;
            font-size: 14px;
            color: #1e293b;
            width: 70%;
        }
        .footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>
    @php
        $formatVal = function($val) {
            if (is_array($val)) {
                return implode(', ', $val);
            }
            return is_scalar($val) ? (string)$val : json_encode($val);
        };

        $formatKey = function($key) {
            return ucwords(str_replace('_', ' ', $key));
        };

        $meetingType = $transcript->meeting_type ?: 'General';
        
        // General sections resolving with fallbacks
        $general = $transcript->general_sections_json ?: [];
        $execSummary = $general['executive_summary'] ?? $evaluation->summary;
        $keyPoints = $general['key_discussion_points'] ?? $evaluation->buying_signals ?? [];
        $needs = $general['customer_needs_pain_points'] ?? $evaluation->objections_detected ?? [];
        $decisions = $general['decision_agreement'] ?? [];
        $actionItems = $general['action_items'] ?? $evaluation->action_items ?? [];
        $risks = $general['risks_concerns'] ?? $evaluation->risks ?? [];
        $nextStep = $general['next_step'] ?? [$evaluation->next_best_action ?? 'Follow up'];
        $missing = $general['missing_information'] ?? $evaluation->missing_information ?? [];

        // Specific sections resolving
        $specificSections = $transcript->meeting_type_sections_json ?: [];
        $bantc = $transcript->bantc_json ?: ($evaluation->bantc_extracted ?: []);
    @endphp

    <div class="container">
        <!-- Cover Section -->
        <div class="cover-page">
            <div class="meeting-type-badge">{{ $meetingType }} Summary</div>
            <h1>{{ $transcript->title ?? 'Meeting Transcript Summary' }}</h1>
            
            <div class="metadata-grid">
                <div class="metadata-row">
                    <div class="metadata-col">
                        <strong>Lead / Customer:</strong><br>
                        {{ $lead->company_name ?? $lead->name ?? 'Unknown Lead' }}
                    </div>
                    <div class="metadata-col" style="text-align: right;">
                        <strong>Document Details:</strong><br>
                        Leadsy Document ID: {{ $documentId }}<br>
                        Meeting Date: {{ $transcript->recorded_at?->format('M d, Y') ?? 'N/A' }}<br>
                        Generated Date: {{ $generatedDate }}
                    </div>
                </div>
            </div>
        </div>

        <!-- General Sections -->
        <div class="section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="card">
                <p class="text-content">{{ $formatVal($execSummary) ?: 'No executive summary available.' }}</p>
            </div>
        </div>

        @if(!empty($keyPoints))
            <div class="section">
                <h2 class="section-title">Key Discussion Points</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($keyPoints as $point)
                            <li>{{ $formatVal($point) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        @if(!empty($needs))
            <div class="section">
                <h2 class="section-title">Customer Needs & Pain Points</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($needs as $need)
                            <li>{{ $formatVal($need) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        @if(!empty($decisions))
            <div class="section">
                <h2 class="section-title">Decision / Agreement</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($decisions as $decision)
                            <li>{{ $formatVal($decision) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        <!-- BANTC Section -->
        @if(!empty($bantc))
            <div class="section">
                <h2 class="section-title">BANTC Qualification</h2>
                <div class="card" style="padding: 0 10px;">
                    <div class="grid-table">
                        <div class="grid-row">
                            <div class="grid-cell-label">Budget</div>
                            <div class="grid-cell-value">{{ $formatVal($bantc['budget'] ?? 'Not specified') }}</div>
                        </div>
                        <div class="grid-row">
                            <div class="grid-cell-label">Authority</div>
                            <div class="grid-cell-value">{{ $formatVal($bantc['authority'] ?? 'Not specified') }}</div>
                        </div>
                        <div class="grid-row">
                            <div class="grid-cell-label">Needs</div>
                            <div class="grid-cell-value">{{ $formatVal($bantc['needs'] ?? 'Not specified') }}</div>
                        </div>
                        <div class="grid-row">
                            <div class="grid-cell-label">Timeline</div>
                            <div class="grid-cell-value">{{ $formatVal($bantc['timeline'] ?? 'Not specified') }}</div>
                        </div>
                        <div class="grid-row">
                            <div class="grid-cell-label">Competitor</div>
                            <div class="grid-cell-value">{{ $formatVal($bantc['competitor'] ?? 'Not specified') }}</div>
                        </div>
                    </div>
                </div>
            </div>
        @endif

        <!-- Meeting Type-Specific Sections -->
        @if(!empty($specificSections))
            <div class="section">
                <h2 class="section-title">{{ $meetingType }} Focus Details</h2>
                <div class="card" style="padding: 0 10px;">
                    <div class="grid-table">
                        @foreach($specificSections as $key => $value)
                            @if(strtolower($key) !== 'bantc')
                                <div class="grid-row">
                                    <div class="grid-cell-label">{{ $formatKey($key) }}</div>
                                    <div class="grid-cell-value">{{ $formatVal($value) }}</div>
                                </div>
                            @endif
                        @endforeach
                    </div>
                </div>
            </div>
        @endif

        @if($transcript->presales_recommendation)
            <div class="section">
                <h2 class="section-title">Presales Strategy & Recommendation</h2>
                <div class="card">
                    <p class="text-content">{{ $transcript->presales_recommendation }}</p>
                </div>
            </div>
        @endif

        @if(!empty($actionItems))
            <div class="section">
                <h2 class="section-title">Action Items</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($actionItems as $item)
                            <li>{{ $formatVal($item) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        @if(!empty($risks))
            <div class="section">
                <h2 class="section-title">Risks / Concerns</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($risks as $risk)
                            <li>{{ $formatVal($risk) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        <div class="section">
            <h2 class="section-title">Next Steps</h2>
            <div class="card">
                <ul class="list-items">
                    @foreach($nextStep as $step)
                        <li>{{ $formatVal($step) }}</li>
                    @endforeach
                </ul>
            </div>
        </div>

        @if(!empty($missing))
            <div class="section">
                <h2 class="section-title">Missing Information</h2>
                <div class="card">
                    <ul class="list-items">
                        @foreach($missing as $info)
                            <li>{{ $formatVal($info) }}</li>
                        @endforeach
                    </ul>
                </div>
            </div>
        @endif

        <!-- Footer -->
        <div class="footer">
            Generated by Leadsy AI &bull; Document ID: {{ $documentId }}<br>
            Confidential &bull; B2B Presales & Sales Intelligence &bull; Internal Use Only
        </div>
    </div>
</body>
</html>
