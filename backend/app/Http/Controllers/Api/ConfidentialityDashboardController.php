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
            'has_notes' => \DB::table('lead_notes')->count(),
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
