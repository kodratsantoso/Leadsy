<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\CustomerSuccess\AccountReviewGeneratorService;
use App\Services\CustomerSuccess\CustomerSuccessPlaybookService;
use App\Services\Sales\LeadSourceQualityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Sprint5PolishController extends Controller
{
    /**
     * Generate QBR / Monthly Account Review for a client account.
     */
    public function generateAccountReview(
        Request $request,
        Lead $lead,
        AccountReviewGeneratorService $service
    ): JsonResponse {
        $period = $request->input('period', 'Quarterly');
        $review = $service->generateAccountReview($lead, $period);

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'data' => $review,
        ]);
    }

    /**
     * Generate tactical CS Playbook for a specific client scenario.
     */
    public function generateCsPlaybook(
        Request $request,
        Lead $lead,
        CustomerSuccessPlaybookService $service
    ): JsonResponse {
        $scenario = $request->input('scenario', 'churn_risk_recovery');
        $playbook = $service->generatePlaybook($lead, $scenario);

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'data' => $playbook,
        ]);
    }

    /**
     * Get comparative analytics ranking lead sources and channels by conversion quality.
     */
    public function getLeadSourceQualityReport(LeadSourceQualityService $service): JsonResponse
    {
        $report = $service->evaluateSourceQuality();

        return response()->json([
            'success' => true,
            'count' => $report->count(),
            'data' => $report,
        ]);
    }
}
