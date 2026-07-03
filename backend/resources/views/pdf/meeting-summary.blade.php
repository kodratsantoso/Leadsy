<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Summary - {{ $documentId }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 30px;
            background-color: #f8fafc;
        }
        .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 { 
            font-size: 28px; 
            color: #0f172a; 
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
        }
        .metadata {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .meta-col {
            display: table-cell;
            width: 50%;
            font-size: 13px;
            color: #64748b;
        }
        .meta-col strong { color: #334155; }
        
        .section { margin-bottom: 30px; }
        .section-title { 
            font-size: 18px; 
            color: #1e293b; 
            margin: 0 0 15px 0; 
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
        }
        
        .card { 
            background-color: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 6px; 
            padding: 20px; 
        }
        
        .text-content { font-size: 14px; margin: 0; color: #334155; line-height: 1.7; }
        
        .grid { display: table; width: 100%; border-collapse: collapse; }
        .grid-row { display: table-row; border-bottom: 1px solid #f1f5f9; }
        .grid-row:last-child { border-bottom: none; }
        .grid-cell { display: table-cell; padding: 12px 10px; font-size: 14px; }
        .grid-header { font-weight: 600; color: #475569; width: 25%; vertical-align: top;}
        .grid-value { width: 75%; color: #1e293b; }
        
        ul { margin: 0; padding-left: 20px; }
        li { font-size: 14px; color: #334155; margin-bottom: 8px; }
        
        .badge { 
            display: inline-block; 
            padding: 4px 10px; 
            font-size: 11px; 
            font-weight: 700; 
            border-radius: 12px; 
            background-color: #e0e7ff; 
            color: #3730a3;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-score { background-color: #dcfce7; color: #166534; }
        
        .footer { 
            font-size: 11px; 
            color: #94a3b8; 
            text-align: center; 
            margin-top: 50px; 
            padding-top: 20px;
            border-top: 1px solid #e2e8f0; 
        }
    </style>
</head>
<body>
    @php
        $formatString = function($val) {
            if (is_array($val)) {
                if (isset($val['Value'])) return is_array($val['Value']) ? implode(', ', $val['Value']) : (string)$val['Value'];
                if (isset($val['value'])) return is_array($val['value']) ? implode(', ', $val['value']) : (string)$val['value'];
                return implode(', ', \Illuminate\Support\Arr::flatten($val));
            }
            return is_scalar($val) ? (string) $val : json_encode($val);
        };
    @endphp
    <div class="container">
        <div class="header">
            <h1>Meeting Summary & Analysis</h1>
            <div class="metadata">
                <div class="meta-col">
                    <strong>Lead / Customer:</strong><br>
                    {{ $lead->company_name ?? $lead->name ?? 'Unknown Lead' }}
                </div>
                <div class="meta-col" style="text-align: right;">
                    <strong>Meeting Details:</strong><br>
                    {{ $transcript->title ?? 'Transcript Analysis' }}<br>
                    {{ $transcript->recorded_at?->format('F d, Y') ?? 'N/A' }}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="card">
                <p class="text-content">{{ $formatString($evaluation->summary ?? 'No executive summary available.') }}</p>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">BANTC Assessment</h2>
            @php $bantc = $evaluation->bantc_extracted ?? []; @endphp
            <div class="grid">
                <div class="grid-row">
                    <div class="grid-cell grid-header">Budget</div>
                    <div class="grid-cell grid-value">{{ $formatString($bantc['budget'] ?? 'Not specified') }}</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Authority</div>
                    <div class="grid-cell grid-value">{{ $formatString($bantc['authority'] ?? 'Not specified') }}</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Needs</div>
                    <div class="grid-cell grid-value">{{ $formatString($bantc['needs'] ?? 'Not specified') }}</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Timeline</div>
                    <div class="grid-cell grid-value">{{ $formatString($bantc['timeline'] ?? 'Not specified') }}</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Competitor</div>
                    <div class="grid-cell grid-value">{{ $formatString($bantc['competitor'] ?? 'Not specified') }}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Customer Objections & Pain Points</h2>
            @php $objections = $evaluation->objections_detected ?? []; @endphp
            <div class="card">
                @if(count($objections) > 0)
                    <ul>
                        @foreach($objections as $objection)
                            <li>{{ is_string($objection) ? $objection : json_encode($objection) }}</li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-content">No specific objections or pain points recorded.</p>
                @endif
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Eligibility & Scoring</h2>
            <div class="grid">
                <div class="grid-row">
                    <div class="grid-cell grid-header">Status</div>
                    <div class="grid-cell grid-value"><span class="badge">{{ $lead->eligibility_status ?? 'Unassessed' }}</span></div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Lead Score</div>
                    <div class="grid-cell grid-value"><span class="badge badge-score">{{ $lead->score ?? 'N/A' }} / 100</span></div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">AI Confidence</div>
                    <div class="grid-cell grid-value">{{ $evaluation->confidence_score ?? 'N/A' }}%</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Reasoning</div>
                    <div class="grid-cell grid-value">{{ $formatString($evaluation->eligibility_reason ?? 'N/A') }}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Presales Observation</h2>
            <div class="card">
                <p class="text-content" style="margin-bottom: 15px;">
                    <strong>Observation:</strong><br>
                    {{ $formatString($evaluation->presales_analysis ?? 'No detailed presales observation available.') }}
                </p>
                <p class="text-content">
                    <strong>Recommendation:</strong><br>
                    {{ $formatString($evaluation->presales_recommendation ?? 'No specific recommendation provided.') }}
                </p>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Challenge & Current Environment</h2>
            <div class="grid">
                <div class="grid-row">
                    <div class="grid-cell grid-header">Main Challenge</div>
                    <div class="grid-cell grid-value">{{ $formatString($evaluation->challenge ?? 'Not specified') }}</div>
                </div>
                <div class="grid-row">
                    <div class="grid-cell grid-header">Legacy Tools/System</div>
                    <div class="grid-cell grid-value">{{ $formatString($evaluation->legacy_tools ?? 'Not specified') }}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Risks & Attention Highlights</h2>
            @php $risks = $evaluation->risks ?? []; @endphp
            <div class="card">
                @if(count($risks) > 0)
                    <ul>
                        @foreach($risks as $risk)
                            <li>{{ is_string($risk) ? $risk : json_encode($risk) }}</li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-content">No specific risks highlighted.</p>
                @endif
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Action Items</h2>
            @php $actionItems = $evaluation->action_items ?? []; @endphp
            <div class="card">
                @if(count($actionItems) > 0)
                    <ul>
                        @foreach($actionItems as $item)
                            <li>{{ is_string($item) ? $item : json_encode($item) }}</li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-content">No specific action items recorded.</p>
                @endif
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">Missing Information</h2>
            @php $missingInfo = $evaluation->missing_information ?? []; @endphp
            <div class="card">
                @if(count($missingInfo) > 0)
                    <ul>
                        @foreach($missingInfo as $info)
                            <li>{{ is_string($info) ? $info : json_encode($info) }}</li>
                        @endforeach
                    </ul>
                @else
                    <p class="text-content">No critical missing information detected.</p>
                @endif
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Next Action</h2>
            <p class="text-content"><strong>Next Best Action:</strong> {{ $formatString($evaluation->next_best_action ?? 'Follow up as standard procedure.') }}</p>
            <p class="text-content"><strong>Estimated Closing Date:</strong> {{ $formatString($evaluation->estimated_closing_date ?? 'Not provided') }}</p>
        </div>
        
        <div class="footer">
            Generated by Leadsy AI &bull; Document ID: {{ $documentId }} &bull; {{ $generatedDate }}<br>
            Internal Use Only
        </div>
    </div>
</body>
</html>
