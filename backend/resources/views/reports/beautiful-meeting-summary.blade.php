<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Summary</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- ApexCharts for Charts -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc; /* slate-50 */
            padding: 2rem;
            color: #0f172a;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            padding: 2rem;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(to right, #f8fafc, #ffffff);
        }
        .section {
            padding: 1.5rem;
        }
        .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
        }
        .info-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.25rem;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .badge {
            display: inline-flex;
            align-items: center;
            border-radius: 9999px;
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-indigo { background-color: #e0e7ff; color: #4338ca; }
        .text-truncate {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    @php
        $typeKey = match (strtolower(str_replace([' ', '-'], '_', $transcript->meeting_type ?: 'General'))) {
            'demo' => 'demo',
            'follow_up' => 'follow_up',
            'proposal_discussion' => 'proposal_discussion',
            'closing_discussion' => 'closing_discussion',
            'handover_to_csm' => 'handover_to_csm',
            default => 'discovery'
        };

        $general = $transcript->general_sections_json ?: [];
        $detailed = $transcript->detailed_insights_json ?: [];
        $conclusion = $transcript->conclusion_section_json ?: [];
        $meetingSpecific = $transcript->meeting_type_sections_json ?: [];
        $sentiment = $general['overall_sentiment'] ?? ['positive' => 0, 'neutral' => 0, 'negative' => 0];

        $fourCardsConfig = [];
        if ($typeKey === 'demo') {
            $fourCardsConfig = [
                ['title' => 'FEATURES DEMONSTRATED', 'data' => $meetingSpecific['features_demonstrated'] ?? [], 'color' => 'bg-blue-400'],
                ['title' => 'CUSTOMER REACTIONS', 'data' => $meetingSpecific['customer_reactions'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'QUESTIONS & OBJECTIONS', 'data' => $meetingSpecific['questions_objections'] ?? [], 'color' => 'bg-orange-400'],
                ['title' => 'KEY TAKEAWAYS', 'data' => $meetingSpecific['key_takeaways'] ?? [], 'color' => 'bg-purple-400']
            ];
        } elseif ($typeKey === 'follow_up') {
            $fourCardsConfig = [
                ['title' => 'PREVIOUS COMMITMENTS', 'data' => $meetingSpecific['previous_commitments'] ?? [], 'color' => 'bg-slate-400'],
                ['title' => 'COMPLETED ITEMS', 'data' => $meetingSpecific['completed_items'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'PENDING ISSUES', 'data' => $meetingSpecific['pending_issues'] ?? [], 'color' => 'bg-orange-400'],
                ['title' => 'UPDATED DECISIONS', 'data' => $meetingSpecific['updated_decisions'] ?? [], 'color' => 'bg-blue-400']
            ];
        } elseif ($typeKey === 'proposal_discussion') {
            $fourCardsConfig = [
                ['title' => 'SCOPE DISCUSSION', 'data' => $meetingSpecific['scope_discussion'] ?? [], 'color' => 'bg-blue-400'],
                ['title' => 'COMMERCIAL FEEDBACK', 'data' => $meetingSpecific['commercial_feedback'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'NEGOTIATION POINTS', 'data' => $meetingSpecific['negotiation_points'] ?? [], 'color' => 'bg-orange-400'],
                ['title' => 'AGREEMENTS & PENDING', 'data' => $meetingSpecific['agreements_pending'] ?? [], 'color' => 'bg-purple-400']
            ];
        } elseif ($typeKey === 'closing_discussion') {
            $fourCardsConfig = [
                ['title' => 'FINAL OBJECTIONS', 'data' => $meetingSpecific['final_objections'] ?? [], 'color' => 'bg-red-400'],
                ['title' => 'DECISION STATUS', 'data' => $meetingSpecific['decision_status'] ?? [], 'color' => 'bg-blue-400'],
                ['title' => 'COMMERCIAL READINESS', 'data' => $meetingSpecific['commercial_readiness'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'CLOSING AGREEMENTS', 'data' => $meetingSpecific['closing_agreements'] ?? [], 'color' => 'bg-purple-400']
            ];
        } elseif ($typeKey === 'handover_to_csm') {
            $fourCardsConfig = [
                ['title' => 'CUSTOMER PROFILE', 'data' => $meetingSpecific['customer_profile'] ?? [], 'color' => 'bg-blue-400'],
                ['title' => 'PURCHASED SCOPE', 'data' => $meetingSpecific['purchased_scope'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'KEY STAKEHOLDERS', 'data' => $meetingSpecific['key_stakeholders'] ?? [], 'color' => 'bg-purple-400'],
                ['title' => 'RISKS & OPEN ITEMS', 'data' => $meetingSpecific['risks_open_items'] ?? [], 'color' => 'bg-orange-400']
            ];
        } else {
            $fourCardsConfig = [
                ['title' => 'KEY PAIN POINTS', 'data' => $general['key_pain_points'] ?? [], 'color' => 'bg-red-400'],
                ['title' => 'CUSTOMER NEEDS', 'data' => $general['customer_needs'] ?? [], 'color' => 'bg-blue-400'],
                ['title' => 'KEY DISCUSSIONS', 'data' => $general['key_discussions'] ?? [], 'color' => 'bg-emerald-400'],
                ['title' => 'DECISIONS & AGREEMENTS', 'data' => $general['decisions_agreements'] ?? $general['decisions'] ?? [], 'color' => 'bg-orange-400']
            ];
        }

        $tableConfig = ['title' => 'TOPICS DISCUSSED', 'headers' => ['Topic', 'Summary', 'Relevance'], 'data' => $detailed['topics_discussed'] ?? [], 'keys' => ['topic', 'summary', 'relevance']];
        if ($typeKey === 'demo') {
            $tableConfig = ['title' => 'DEMO HIGHLIGHTS', 'headers' => ['Feature', 'Summary', 'Interest Level'], 'data' => $detailed['demo_highlights'] ?? [], 'keys' => ['feature', 'summary', 'interest_level']];
        } elseif ($typeKey === 'follow_up') {
            $tableConfig = ['title' => 'PROGRESS REVIEW', 'headers' => ['Topic', 'Current Update', 'Progress'], 'data' => $detailed['progress_review'] ?? [], 'keys' => ['topic', 'current_update', 'progress']];
        } elseif ($typeKey === 'proposal_discussion') {
            $tableConfig = ['title' => 'PROPOSAL REVIEW', 'headers' => ['Topic', 'Summary', 'Alignment'], 'data' => $detailed['proposal_review'] ?? [], 'keys' => ['topic', 'summary', 'alignment']];
        } elseif ($typeKey === 'closing_discussion') {
            $tableConfig = ['title' => 'CLOSING REVIEW', 'headers' => ['Topic', 'Summary', 'Readiness'], 'data' => $detailed['closing_review'] ?? [], 'keys' => ['topic', 'summary', 'readiness']];
        } elseif ($typeKey === 'handover_to_csm') {
            $tableConfig = ['title' => 'HANDOVER CHECKLIST', 'headers' => ['Topic', 'Summary', 'Completeness'], 'data' => $detailed['handover_checklist'] ?? [], 'keys' => ['topic', 'summary', 'completeness']];
        }

        $chartConfig = ['type' => 'radar', 'title' => 'BUYING SIGNALS RADAR', 'categories' => [], 'data' => []];
        if ($typeKey === 'demo') {
            $r = $detailed['feature_interest_radar'] ?? [];
            $chartConfig = [
                'type' => 'radar', 'title' => 'FEATURE INTEREST RADAR',
                'categories' => ['Workflow', 'Kolaboratif', 'Lark Base', 'Integrasi', 'Dashboard', 'Keamanan'],
                'data' => [$r['workflow_approval']??0, $r['dokumen_kolaboratif']??0, $r['lark_base']??0, $r['messenger_integrasi']??0, $r['dashboard_laporan']??0, $r['keamanan_akses']??0]
            ];
        } elseif ($typeKey === 'follow_up') {
            $c = $detailed['open_vs_completed'] ?? ['completed' => 0, 'on_track' => 0, 'pending' => 0];
            $chartConfig = [
                'type' => 'donut', 'title' => 'OPEN VS COMPLETED FOLLOW-UPS',
                'labels' => ['Completed', 'On Track', 'Pending'],
                'data' => [$c['completed']??0, $c['on_track']??0, $c['pending']??0]
            ];
        } elseif ($typeKey === 'proposal_discussion') {
            $r = $detailed['proposal_alignment_radar'] ?? [];
            $chartConfig = [
                'type' => 'radar', 'title' => 'PROPOSAL ALIGNMENT RADAR',
                'categories' => ['Scope Fit', 'Price', 'Timeline', 'Tech Fit', 'Readiness'],
                'data' => [($r['scope_fit']??0)/20, ($r['price_acceptance']??0)/20, ($r['timeline_alignment']??0)/20, ($r['technical_fit']??0)/20, ($r['decision_readiness']??0)/20]
            ];
        } elseif ($typeKey === 'closing_discussion') {
            $r = $detailed['deal_readiness_radar'] ?? [];
            $chartConfig = [
                'type' => 'radar', 'title' => 'DEAL READINESS RADAR',
                'categories' => ['Objection', 'Budget', 'Contract', 'Timeline', 'Competitive', 'DM Support'],
                'data' => [$r['objection_status']??0, $r['budget_approval']??0, $r['contract_readiness']??0, $r['timeline_commitment']??0, $r['competitive_position']??0, $r['decision_maker_support']??0]
            ];
        } elseif ($typeKey === 'handover_to_csm') {
            $r = $detailed['onboarding_readiness_radar'] ?? [];
            $chartConfig = [
                'type' => 'radar', 'title' => 'ONBOARDING READINESS',
                'categories' => ['Contract', 'Scope', 'Stakeholder', 'Success Crit', 'Risk Info', 'Milestone'],
                'data' => [$r['contract_info']??0, $r['scope_clarity']??0, $r['stakeholder_mapping']??0, $r['success_criteria']??0, $r['risk_information']??0, $r['next_milestone']??0]
            ];
        } else {
            $r = $detailed['buying_signals_radar'] ?? [];
            $chartConfig = [
                'type' => 'radar', 'title' => 'BUYING SIGNALS RADAR',
                'categories' => ['Kebutuhan', 'Urgensi', 'Budget', 'Support', 'Solusi Fit', 'Niat'],
                'data' => [$r['kebutuhan']??0, $r['urgensi']??0, $r['budget_kesiapan']??0, $r['decision_support']??0, $r['solusi_fit']??0, $r['niat_implementasi']??0]
            ];
        }

        $conclusionFields = [];
        if ($typeKey === 'demo') {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'TRIAL POTENTIAL', 'value' => $conclusion['trial_poc_potensial'] ?? '-'],
                ['label' => 'DECISION TIMELINE', 'value' => $conclusion['decision_timeline'] ?? '-']
            ];
        } elseif ($typeKey === 'follow_up') {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'BLOCKERS', 'value' => $conclusion['blockers'] ?? '-'],
                ['label' => 'REVISED TIMELINE', 'value' => $conclusion['revised_timeline'] ?? '-']
            ];
        } elseif ($typeKey === 'proposal_discussion') {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'EXPECTED REVISION', 'value' => $conclusion['expected_revision'] ?? '-'],
                ['label' => 'APPROVAL PATH', 'value' => $conclusion['approval_path'] ?? '-']
            ];
        } elseif ($typeKey === 'closing_discussion') {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'TARGET CLOSE DATE', 'value' => $conclusion['target_close_date'] ?? '-'],
                ['label' => 'KEY RISK', 'value' => $conclusion['key_risk'] ?? '-']
            ];
        } elseif ($typeKey === 'handover_to_csm') {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'CS GOAL', 'value' => $conclusion['customer_success_goal'] ?? '-'],
                ['label' => 'FIRST MILESTONE', 'value' => $conclusion['first_milestone'] ?? '-']
            ];
        } else {
            $conclusionFields = [
                ['label' => 'NEXT STEP', 'value' => $conclusion['next_step'] ?? '-'],
                ['label' => 'EXPECTED OUTCOME', 'value' => $conclusion['expected_outcome'] ?? '-'],
                ['label' => 'TARGET TIMELINE', 'value' => $conclusion['target_implementation'] ?? '-']
            ];
        }
    @endphp
    <div class="container" id="report-container">
        <!-- HEADER -->
        <div class="header">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight uppercase mb-1">MEETING SUMMARY</h1>
                    <p class="text-slate-500 text-sm font-medium">AI-Powered Summary by Leadsy</p>
                </div>
                <div>
                    <span class="badge badge-indigo">
                        AI SUMMARY: {{ strtoupper($typeKey ?? 'DISCOVERY') }}
                    </span>
                </div>
            </div>
            
            <div class="grid grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                <div>
                    <div class="text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wider">Meeting Type</div>
                    <div class="font-medium text-slate-800">{{ $transcript->meeting_type ?: 'General' }}</div>
                </div>
                <div>
                    <div class="text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wider">Product</div>
                    <div class="font-medium text-slate-800">{{ $lead->product->name ?? 'LarkSuite' }}</div>
                </div>
                <div>
                    <div class="text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wider">Company</div>
                    <div class="font-medium text-slate-800 text-truncate" title="{{ $lead->company_name }}">{{ $lead->company_name ?? 'Unknown' }}</div>
                </div>
                <div>
                    <div class="text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wider">Date & Time</div>
                    <div class="font-medium text-slate-800">{{ $transcript->recorded_at ? $transcript->recorded_at->format('d M Y') : '-' }}</div>
                </div>
                <div>
                    <div class="text-slate-400 font-semibold mb-1 text-xs uppercase tracking-wider">Owner</div>
                    <div class="font-medium text-slate-800">{{ $lead->owner->name ?? 'Unassigned' }}</div>
                </div>
            </div>
        </div>

        <div class="section flex gap-6">
            <!-- LEFT COL: EXEC SUMMARY -->
            <div class="w-2/3">
                <div class="info-card h-full">
                    <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span class="text-indigo-500">📄</span> EXECUTIVE SUMMARY
                    </h2>
                    <p class="text-sm text-slate-600 leading-relaxed">
                        {{ $general['executive_summary'] ?? 'No executive summary provided.' }}
                    </p>
                </div>
            </div>
            <!-- RIGHT COL: SENTIMENT -->
            <div class="w-1/3">
                <div class="info-card h-full flex flex-col">
                    <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <span class="text-blue-500">📊</span> OVERALL SENTIMENT
                    </h2>
                    <div class="flex-1 min-h-[150px] relative w-full" id="sentimentChart"></div>
                </div>
            </div>
        </div>

        <!-- 4 CARDS -->
        <div class="section pt-0">
            <div class="card-grid">
                @foreach($fourCardsConfig as $card)
                <div class="info-card">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span class="w-2 h-2 rounded-full {{ $card['color'] }}"></span>
                        {{ $card['title'] }}
                    </h3>
                    <ul class="space-y-2">
                        @forelse($card['data'] as $item)
                        <li class="flex items-start gap-2 text-sm text-slate-600">
                            <span class="text-slate-400 mt-0.5">•</span>
                            @if(is_array($item))
                                <span>
                                    @foreach($item as $k => $v)
                                        @if($loop->first) <strong>{{ $v }}</strong> @else - {{ $v }} @endif
                                    @endforeach
                                </span>
                            @else
                                <span>{{ $item }}</span>
                            @endif
                        </li>
                        @empty
                        <li class="text-sm text-slate-400 italic">No data available</li>
                        @endforelse
                    </ul>
                </div>
                @endforeach
            </div>
        </div>

        <!-- DETAILED INSIGHTS & ACTION PLAN -->
        <div class="header bg-slate-50 py-3 border-y border-slate-200 flex items-center gap-2 mt-2">
            <span class="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">PAGE 2</span>
            <h2 class="text-sm font-bold text-slate-800 tracking-wider">DETAILED INSIGHTS & ACTION PLAN</h2>
        </div>

        <div class="section flex gap-6">
            <!-- TOPICS TABLE -->
            <div class="w-7/12">
                <div class="info-card h-full">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <span class="text-blue-500">📋</span> {{ $tableConfig['title'] }}
                    </h3>
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                @foreach($tableConfig['headers'] as $header)
                                <th class="px-4 py-3">{{ $header }}</th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            @forelse($tableConfig['data'] as $row)
                            <tr>
                                @foreach($tableConfig['keys'] as $key)
                                <td class="px-4 py-3 align-top {{ $loop->first ? 'font-medium text-slate-900' : 'text-slate-600' }}">
                                    @if($loop->last && in_array(strtolower($row[$key] ?? ''), ['high', 'tinggi', 'yes', 'completed', 'strong']))
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                            {{ $row[$key] }}
                                        </span>
                                    @elseif($loop->last && in_array(strtolower($row[$key] ?? ''), ['medium', 'sedang', 'pending']))
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                            {{ $row[$key] }}
                                        </span>
                                    @else
                                        {{ $row[$key] ?? '-' }}
                                    @endif
                                </td>
                                @endforeach
                            </tr>
                            @empty
                            <tr>
                                <td colspan="3" class="px-4 py-4 text-center text-slate-400 italic">No topics recorded</td>
                            </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- RADAR CHART -->
            <div class="w-5/12">
                <div class="info-card h-full flex flex-col">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                        <span class="text-indigo-500">🎯</span> {{ $chartConfig['title'] }}
                    </h3>
                    <div class="flex-1 min-h-[300px] relative w-full" id="radarChart"></div>
                </div>
            </div>
        </div>

        <div class="section flex gap-6 pt-0">
            <!-- ACTION ITEMS -->
            <div class="w-7/12">
                <div class="info-card h-full">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <span class="text-purple-500">☑️</span> ACTION ITEMS
                    </h3>
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-3 py-2 w-8">No</th>
                                <th class="px-3 py-2">Action Item</th>
                                <th class="px-3 py-2">PIC</th>
                                <th class="px-3 py-2">Due Date</th>
                                <th class="px-3 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            @forelse($detailed['action_items'] ?? [] as $idx => $item)
                            <tr>
                                <td class="px-3 py-3 align-top text-slate-500">{{ $idx + 1 }}</td>
                                <td class="px-3 py-3 align-top font-medium text-slate-900">{{ $item['item'] ?? '-' }}</td>
                                <td class="px-3 py-3 align-top text-slate-600">{{ $item['pic'] ?? '-' }}</td>
                                <td class="px-3 py-3 align-top text-slate-600">{{ $item['due_date'] ?? '-' }}</td>
                                <td class="px-3 py-3 align-top">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                                        {{ strtolower($item['status'] ?? '') === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200' }}">
                                        {{ $item['status'] ?? 'Open' }}
                                    </span>
                                </td>
                            </tr>
                            @empty
                            <tr>
                                <td colspan="5" class="px-3 py-4 text-center text-slate-400 italic">No action items assigned</td>
                            </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- CONCLUSION -->
            <div class="w-5/12">
                <div class="info-card h-full flex flex-col bg-slate-50 border-emerald-100">
                    <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span class="text-emerald-500">💡</span> CONCLUSION
                    </h3>
                    <p class="text-sm text-slate-700 leading-relaxed mb-6 italic">
                        "{{ $conclusion['conclusion'] ?? 'No conclusion provided.' }}"
                    </p>
                    <div class="mt-auto grid grid-cols-3 gap-3">
                        @foreach($conclusionFields as $field)
                        <div class="bg-white p-3 rounded border border-slate-200 shadow-sm">
                            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">{{ $field['label'] }}</div>
                            <div class="text-xs font-semibold text-slate-800">{{ $field['value'] }}</div>
                        </div>
                        @endforeach
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Render Charts -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Sentiment Donut Chart
            const sentimentData = {
                positive: {{ $sentiment['positive'] ?? 0 }},
                neutral: {{ $sentiment['neutral'] ?? 0 }},
                negative: {{ $sentiment['negative'] ?? 0 }}
            };
            
            new ApexCharts(document.querySelector("#sentimentChart"), {
                series: [sentimentData.positive, sentimentData.neutral, sentimentData.negative],
                chart: { type: 'donut', height: 160, animations: { enabled: false } },
                labels: ['Positive', 'Neutral', 'Negative'],
                colors: ['#10b981', '#f59e0b', '#ef4444'],
                plotOptions: {
                    pie: {
                        donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Sentiment' } } }
                    }
                },
                dataLabels: { enabled: false },
                legend: { position: 'right', fontSize: '10px' },
                stroke: { width: 0 }
            }).render();

            // Radar Chart
            const radarChartData = {!! json_encode($chartConfig) !!};
            
            if (radarChartData.type === 'radar') {
                new ApexCharts(document.querySelector("#radarChart"), {
                    series: [{ name: 'Score', data: radarChartData.data }],
                    chart: { type: 'radar', height: 280, toolbar: { show: false }, animations: { enabled: false } },
                    labels: radarChartData.categories,
                    stroke: { width: 2, colors: ['#3b82f6'] },
                    fill: { opacity: 0.2, colors: ['#3b82f6'] },
                    markers: { size: 4, colors: ['#fff'], strokeColors: '#3b82f6', strokeWidth: 2 },
                    yaxis: { show: false, min: 0, max: radarChartData.categories.length === 5 ? 5 : 5 /* handle 0-5 scale */ },
                    plotOptions: { radar: { polygons: { strokeColors: '#e2e8f0', connectorColors: '#e2e8f0' } } }
                }).render();
            } else if (radarChartData.type === 'donut') {
                new ApexCharts(document.querySelector("#radarChart"), {
                    series: radarChartData.data,
                    chart: { type: 'donut', height: 280, animations: { enabled: false } },
                    labels: radarChartData.labels,
                    colors: ['#10b981', '#3b82f6', '#f59e0b'],
                    legend: { position: 'bottom' }
                }).render();
            }
        });
    </script>
</body>
</html>
