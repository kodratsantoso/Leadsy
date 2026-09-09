<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\CustomerSuccess\CsmProactiveAlertService;
use App\Services\CustomerSuccess\CustomerFeedbackService;
use App\Services\CustomerSuccess\CustomerRenewalIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Sprint4CustomerSuccessAdvancedController extends Controller
{
    /**
     * Get all active renewal opportunities across clients.
     */
    public function getRenewalOpportunities(CustomerRenewalIntelligenceService $service): JsonResponse
    {
        $opportunities = $service->detectRenewalOpportunities();

        return response()->json([
            'success' => true,
            'count' => $opportunities->count(),
            'data' => $opportunities,
        ]);
    }

    /**
     * Get renewal and cross-sell intelligence for a specific lead.
     */
    public function getLeadRenewalIntelligence(Lead $lead, CustomerRenewalIntelligenceService $service): JsonResponse
    {
        $renewals = $lead->renewalOpportunities()->where('opportunity_type', 'renewal')->get();
        $crossSells = $service->detectCrossSellOpportunities($lead);

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'renewals' => $renewals,
            'cross_sells' => $crossSells,
        ]);
    }

    /**
     * Record customer survey response (NPS/CSAT).
     */
    public function recordFeedback(Request $request, Lead $lead, CustomerFeedbackService $service): JsonResponse
    {
        $data = $request->validate([
            'survey_type' => 'required|string|in:nps,csat,onboarding_review,qbr_feedback',
            'score' => 'required|integer',
            'feedback_text' => 'nullable|string',
            'contact_id' => 'nullable|integer',
            'sales_order_id' => 'nullable|integer',
        ]);

        $feedback = $service->recordFeedback($lead, $data);

        return response()->json([
            'success' => true,
            'message' => "Customer {$feedback->survey_type} feedback recorded successfully.",
            'data' => $feedback,
        ]);
    }

    /**
     * Get feedback history for a lead.
     */
    public function getFeedbacks(Lead $lead): JsonResponse
    {
        $feedbacks = $lead->feedbacks()->latest()->get();

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'count' => $feedbacks->count(),
            'data' => $feedbacks,
        ]);
    }

    /**
     * Trigger proactive CSM alert scan.
     */
    public function getProactiveAlerts(CsmProactiveAlertService $service): JsonResponse
    {
        $alerts = $service->runProactiveScan();

        return response()->json([
            'success' => true,
            'count' => $alerts->count(),
            'data' => $alerts,
        ]);
    }
}
