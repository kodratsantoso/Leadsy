<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Lead;
use App\Models\ConfidentialityAssessment;
use App\Services\Analytics\ConfidentialityScoringService;

class ConfidentialityDashboardController extends Controller
{
    protected $scoringService;

    public function __construct(ConfidentialityScoringService $scoringService)
    {
        $this->scoringService = $scoringService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Block 1: Overview KPIs
        $totalAssessed = ConfidentialityAssessment::count();
        $restricted = ConfidentialityAssessment::where('confidentiality_level', 'restricted')->count();
        $high = ConfidentialityAssessment::where('confidentiality_level', 'high')->count();
        $medium = ConfidentialityAssessment::where('confidentiality_level', 'medium')->count();
        $low = ConfidentialityAssessment::where('confidentiality_level', 'low')->count();
        
        $totalLeads = Lead::count();
        $unassessed = max(0, $totalLeads - $totalAssessed);
        
        // Calculate risk (e.g., restricted but not reviewed)
        $riskCount = ConfidentialityAssessment::whereIn('confidentiality_level', ['high', 'restricted'])
            ->where('status', 'draft')
            ->count();

        // Block 2: Distribution
        $distribution = [
            ['name' => 'Low', 'value' => $low],
            ['name' => 'Medium', 'value' => $medium],
            ['name' => 'High', 'value' => $high],
            ['name' => 'Restricted', 'value' => $restricted],
            ['name' => 'Unassessed', 'value' => $unassessed],
        ];

        // Block 3: Matrix Table (Latest assessments)
        $matrixTable = ConfidentialityAssessment::with('entity.owner', 'entity.funnelStage', 'entity.roleAssignments')
            ->orderByDesc('score')
            ->take(10)
            ->get()
            ->map(function ($assessment) {
                return [
                    'id' => $assessment->id,
                    'lead_id' => $assessment->entity_id,
                    'company_name' => $assessment->entity->company_name ?? 'Unknown',
                    'stage' => $assessment->entity->funnelStage->name ?? 'Unknown',
                    'owner' => $assessment->entity->owner->name ?? 'Unassigned',
                    'role_users' => $assessment->entity->roleAssignments->count(),
                    'level' => $assessment->confidentiality_level,
                    'score' => $assessment->score,
                    'main_reason' => $assessment->recommendation_json[0] ?? 'Calculated from data dimensions',
                    'last_assessed' => $assessment->assessed_at,
                    'status' => $assessment->status
                ];
            });

        // Block 6: Sensitive Indicators
        $indicators = [
            'has_contact_data' => Lead::whereNotNull('email')->orWhereNotNull('phone')->count(),
            'has_transcript' => \DB::table('lead_meetings')->whereNotNull('summary')->count(),
            'has_bantc' => \DB::table('lead_bantc_question_guides')->count(),
            'has_pricing' => Lead::where('estimated_closing_amount', '>', 0)->count(),
            'has_notes' => \DB::table('lead_activities')->where('activity_type', 'note')->count(),
            'has_sales_orders' => \DB::table('lead_sales_orders')->count(),
        ];

        // Block 7: Trend (Last 6 months)
        $trend = collect(range(5, 0))->map(function ($i) {
            $date = now()->subMonths($i);
            $month = $date->format('M Y');
            return [
                'month' => $month,
                'high_restricted' => ConfidentialityAssessment::whereIn('confidentiality_level', ['high', 'restricted'])
                    ->whereYear('assessed_at', $date->year)
                    ->whereMonth('assessed_at', $date->month)
                    ->count()
            ];
        });

        // Block 8: Risk Center
        $risks = ConfidentialityAssessment::with('entity')
            ->whereIn('confidentiality_level', ['high', 'restricted'])
            ->where('status', 'draft')
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'lead_id' => $a->entity_id,
                    'title' => 'Unreviewed Sensitive Lead',
                    'severity' => 'high',
                    'lead' => $a->entity->company_name ?? 'Unknown',
                    'reason' => 'Score of ' . $a->score . ' requires manual review.',
                    'action' => 'Review Assessment',
                    'status' => 'open'
                ];
            });

        return response()->json([
            'overview' => [
                'total_assessed' => $totalAssessed,
                'restricted' => $restricted,
                'high' => $high,
                'medium' => $medium,
                'low' => $low,
                'unassessed' => $unassessed,
                'access_risk' => $riskCount,
                'needs_review' => $riskCount,
            ],
            'distribution' => $distribution,
            'matrix' => $matrixTable,
            'indicators' => $indicators,
            'trend' => $trend,
            'risks' => $risks
        ]);
    }

    public function drilldown(Request $request): JsonResponse
    {
        $level = $request->query('confidentiality_level');
        $filter = $request->query('confidentiality_filter');
        $search = $request->query('search');
        
        $query = ConfidentialityAssessment::with(['entity.owner', 'entity.funnelStage'])
            ->where('entity_type', Lead::class);
            
        if ($level) {
            if ($level === 'unassessed') {
                // For unassessed, we actually need leads that do NOT have an assessment
                $assessedLeadIds = ConfidentialityAssessment::where('entity_type', Lead::class)->pluck('entity_id');
                $leadsQuery = Lead::whereNotIn('id', $assessedLeadIds)->with(['owner', 'funnelStage']);
                
                if ($search) {
                    $leadsQuery->where(function ($q) use ($search) {
                        $q->where('company_name', 'like', "%{$search}%")
                          ->orWhere('lead_name', 'like', "%{$search}%");
                    });
                }
                
                $leads = $leadsQuery->orderByDesc('created_at')->paginate($request->query('per_page', 10));
                
                $records = collect($leads->items())->map(function ($lead) {
                    return [
                        'id' => $lead->id,
                        'lead_id' => $lead->id,
                        'company_name' => $lead->company_name ?? 'Unknown',
                        'stage' => $lead->funnelStage->name ?? 'Unknown',
                        'owner' => $lead->owner->name ?? 'Unassigned',
                        'level' => 'unassessed',
                        'score' => '-',
                        'status' => '-'
                    ];
                });
                
                return response()->json([
                    'columns' => [
                        ['key' => 'company_name', 'label' => 'Lead'],
                        ['key' => 'stage', 'label' => 'Stage'],
                        ['key' => 'owner', 'label' => 'Owner'],
                        ['key' => 'level', 'label' => 'Level'],
                        ['key' => 'score', 'label' => 'Score'],
                        ['key' => 'status', 'label' => 'Status'],
                    ],
                    'records' => $records,
                    'current_page' => $leads->currentPage(),
                    'last_page' => $leads->lastPage(),
                    'total' => $leads->total(),
                ]);
            } else {
                $query->where('confidentiality_level', $level);
            }
        }
        
        if ($filter === 'needs_review') {
            $query->whereIn('confidentiality_level', ['high', 'restricted'])
                  ->where('status', 'draft');
        } elseif ($filter === 'has_bantc') {
            $query->whereHas('entity', function ($q) {
                $q->whereHas('bantcAnswers');
            });
        } elseif ($filter === 'has_transcript') {
            $query->whereHas('entity', function ($q) {
                $q->whereHas('meetings', function ($mq) {
                    $mq->whereNotNull('summary');
                });
            });
        } elseif ($filter === 'has_pricing') {
            $query->whereHas('entity', function ($q) {
                $q->where('estimated_closing_amount', '>', 0);
            });
        } elseif ($filter === 'has_sales_orders') {
            $query->whereHas('entity', function ($q) {
                $q->whereHas('salesOrders');
            });
        }
        
        $month = $request->query('month');
        if ($month) {
            // month is format 'M Y' e.g. 'Jun 2026'
            $date = \Carbon\Carbon::createFromFormat('M Y', $month);
            $query->whereYear('assessed_at', $date->year)
                  ->whereMonth('assessed_at', $date->month);
        }
        
        if ($search) {
            $query->whereHas('entity', function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('lead_name', 'like', "%{$search}%");
            });
        }
        
        $assessments = $query->orderByDesc('score')->paginate($request->query('per_page', 10));
        
        $records = collect($assessments->items())->map(function ($assessment) {
            return [
                'id' => $assessment->id,
                'lead_id' => $assessment->entity_id,
                'company_name' => $assessment->entity->company_name ?? 'Unknown',
                'stage' => $assessment->entity->funnelStage->name ?? 'Unknown',
                'owner' => $assessment->entity->owner->name ?? 'Unassigned',
                'level' => $assessment->confidentiality_level,
                'score' => $assessment->score,
                'status' => $assessment->status
            ];
        });
        
        return response()->json([
            'data' => [
                'columns' => [
                    ['key' => 'company_name', 'label' => 'Lead'],
                    ['key' => 'stage', 'label' => 'Stage'],
                    ['key' => 'owner', 'label' => 'Owner'],
                    ['key' => 'level', 'label' => 'Level'],
                    ['key' => 'score', 'label' => 'Score'],
                    ['key' => 'status', 'label' => 'Status'],
                ],
                'records' => $records,
                'current_page' => $assessments->currentPage(),
                'last_page' => $assessments->lastPage(),
                'total' => $assessments->total()
            ]
        ]);
    }

    public function show(string $entityType, int $entityId): JsonResponse
    {
        // Simple mapping for entity type
        $typeMap = [
            'lead' => Lead::class
        ];
        
        $modelClass = $typeMap[$entityType] ?? Lead::class;
        
        $assessment = ConfidentialityAssessment::where('entity_type', $modelClass)
            ->where('entity_id', $entityId)
            ->first();
            
        if (!$assessment) {
            return response()->json(['message' => 'Assessment not found.'], 404);
        }

        return response()->json([
            'id' => $assessment->id,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'confidentiality_level' => $assessment->confidentiality_level,
            'score' => $assessment->score,
            'assessment_method' => $assessment->assessment_method,
            'score_breakdown' => $assessment->score_breakdown_json ?? [],
            'missing_data' => $assessment->missing_data_json ?? [],
            'recommended_handling' => $assessment->recommendation_json ?? [],
            'review_status' => $assessment->status,
            'confidence' => $assessment->confidence_score,
            'last_assessed' => $assessment->assessed_at
        ]);
    }

    public function recalculate(string $entityType, int $entityId): JsonResponse
    {
        if ($entityType !== 'lead') {
            return response()->json(['message' => 'Only leads supported.'], 400);
        }

        $lead = Lead::findOrFail($entityId);
        $assessment = $this->scoringService->calculateForLead($lead);
        
        return response()->json(['message' => 'Recalculated successfully', 'assessment' => $assessment]);
    }

    public function approve(int $id): JsonResponse
    {
        $assessment = ConfidentialityAssessment::findOrFail($id);
        $assessment->status = 'approved';
        $assessment->reviewed_by = auth()->id();
        $assessment->reviewed_at = now();
        $assessment->save();
        
        return response()->json(['message' => 'Assessment approved']);
    }
}
