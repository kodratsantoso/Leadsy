<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Meeting Summary - {{ $documentId }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
        }
        h1 { font-size: 24px; color: #111; margin-bottom: 5px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
        h2 { font-size: 18px; color: #0f172a; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        h3 { font-size: 14px; color: #475569; margin-top: 15px; margin-bottom: 5px; }
        p { margin: 0 0 10px 0; font-size: 14px; }
        .metadata { font-size: 12px; color: #64748b; margin-bottom: 30px; }
        .grid { display: table; width: 100%; margin-bottom: 20px; }
        .grid-row { display: table-row; }
        .grid-cell { display: table-cell; padding: 8px; border: 1px solid #e2e8f0; }
        .grid-header { font-weight: bold; background-color: #f8fafc; width: 30%; font-size: 12px;}
        .grid-value { width: 70%; font-size: 12px;}
        .section-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 15px; margin-bottom: 20px; }
        .footer { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: bold; border-radius: 12px; background-color: #e2e8f0; color: #334155; }
    </style>
</head>
<body>

    <h1>Meeting Summary & Presales Analysis</h1>
    <div class="metadata">
        <strong>Document ID:</strong> {{ $documentId }} | <strong>Generated:</strong> {{ $generatedDate }}<br>
        <strong>Lead / Customer:</strong> {{ $lead->company_name ?? $lead->name ?? 'Unknown Lead' }}<br>
        <strong>Meeting Source:</strong> {{ $transcript->title ?? 'Transcript Analysis' }} ({{ $transcript->recorded_at?->format('M d, Y') ?? 'N/A' }})
    </div>

    <div class="section-card">
        <h2>1. Executive Summary</h2>
        <p>{{ $evaluation->summary ?? 'No executive summary available.' }}</p>
    </div>

    <h2>2. BANTC Analysis</h2>
    @php
        $bantc = $evaluation->bantc_extracted ?? [];
    @endphp
    <div class="grid">
        <div class="grid-row">
            <div class="grid-cell grid-header">Budget</div>
            <div class="grid-cell grid-value">{{ $bantc['budget'] ?? 'Not specified' }}</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Authority</div>
            <div class="grid-cell grid-value">{{ $bantc['authority'] ?? 'Not specified' }}</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Needs</div>
            <div class="grid-cell grid-value">{{ $bantc['needs'] ?? 'Not specified' }}</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Timeline</div>
            <div class="grid-cell grid-value">{{ $bantc['timeline'] ?? 'Not specified' }}</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Competitor</div>
            <div class="grid-cell grid-value">{{ $bantc['competitor'] ?? 'Not specified' }}</div>
        </div>
    </div>

    <h2>3. Customer Pain Points & Objections</h2>
    @php
        $objections = $evaluation->objections_detected ?? [];
    @endphp
    <ul>
        @forelse($objections as $objection)
            <li><p>{{ is_string($objection) ? $objection : json_encode($objection) }}</p></li>
        @empty
            <li><p>No specific objections or pain points recorded.</p></li>
        @endforelse
    </ul>

    <h2>4. Eligibility Result</h2>
    <div class="grid">
        <div class="grid-row">
            <div class="grid-cell grid-header">Status</div>
            <div class="grid-cell grid-value"><span class="badge">{{ $lead->eligibility_status ?? 'Unassessed' }}</span></div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Lead Score</div>
            <div class="grid-cell grid-value">{{ $lead->score ?? 'N/A' }} / 100</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Confidence</div>
            <div class="grid-cell grid-value">{{ $evaluation->confidence_score ?? 'N/A' }}%</div>
        </div>
        <div class="grid-row">
            <div class="grid-cell grid-header">Reason</div>
            <div class="grid-cell grid-value">{{ $evaluation->eligibility_reason ?? 'N/A' }}</div>
        </div>
    </div>

    <h2>5. Presales Analysis & Solution Fit</h2>
    <div class="section-card">
        <h3>Presales Observation</h3>
        <p>{{ $evaluation->presales_analysis ?? 'No detailed presales observation available.' }}</p>
        
        <h3>Recommendation</h3>
        <p>{{ $evaluation->presales_recommendation ?? 'No specific recommendation provided.' }}</p>
    </div>

    <h2>6. Next Actions</h2>
    <p><strong>Next Best Action:</strong> {{ $evaluation->next_best_action ?? 'Follow up as standard procedure.' }}</p>
    
    <div class="footer">
        Generated by Leadsy AI | Transcript Source ID: {{ $transcript->id }} | Internal Use Only
    </div>

</body>
</html>
