<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerOnboardingMilestone;
use App\Models\Lead;
use App\Services\CustomerSuccess\ChurnRiskDetectionService;
use App\Services\CustomerSuccess\CustomerHealthScoreService;
use App\Services\CustomerSuccess\CustomerOnboardingWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Sprint3CustomerSuccessController extends Controller
{
    /**
     * List health scores across all active clients.
     */
    public function getHealthScores(CustomerHealthScoreService $service): JsonResponse
    {
        $scores = $service->calculateAllActiveCustomers();

        return response()->json([
            'success' => true,
            'count' => $scores->count(),
            'data' => $scores,
        ]);
    }

    /**
     * Get or calculate health score for a specific lead/client.
     */
    public function getLeadHealthScore(Lead $lead, CustomerHealthScoreService $service): JsonResponse
    {
        $score = $lead->latestHealthScore ?? $service->calculateHealthScore($lead);

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'data' => $score,
        ]);
    }

    /**
     * Force recalculate health score for a lead/client.
     */
    public function recalculateHealthScore(Lead $lead, CustomerHealthScoreService $service): JsonResponse
    {
        $score = $service->calculateHealthScore($lead);

        return response()->json([
            'success' => true,
            'message' => 'Customer health score recalculation completed.',
            'data' => $score,
        ]);
    }

    /**
     * Get onboarding milestones for a client.
     */
    public function getOnboardingMilestones(Lead $lead): JsonResponse
    {
        $milestones = $lead->onboardingMilestones;

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'count' => $milestones->count(),
            'data' => $milestones,
        ]);
    }

    /**
     * Generate or re-initialize onboarding workflow for a client.
     */
    public function generateOnboardingWorkflow(
        Request $request,
        Lead $lead,
        CustomerOnboardingWorkflowService $service
    ): JsonResponse {
        $salesOrder = $lead->salesOrders()->latest()->first();
        $milestones = $service->generateOnboardingWorkflow($lead, $salesOrder);

        return response()->json([
            'success' => true,
            'message' => "Generated {$milestones->count()} onboarding milestones for {$lead->company_name}.",
            'data' => $milestones,
        ]);
    }

    /**
     * Update milestone status.
     */
    public function updateMilestone(
        Request $request,
        CustomerOnboardingMilestone $milestone,
        CustomerOnboardingWorkflowService $service
    ): JsonResponse {
        $status = $request->input('status');

        if ($status === 'completed') {
            $milestone = $service->completeMilestone($milestone);
        } else {
            $milestone->update($request->only(['status', 'target_date', 'description']));
        }

        return response()->json([
            'success' => true,
            'message' => 'Milestone status updated successfully.',
            'data' => $milestone,
        ]);
    }

    /**
     * Scan and report churn risks across all accounts.
     */
    public function getChurnRisks(ChurnRiskDetectionService $service): JsonResponse
    {
        $risks = $service->detectChurnRisks();

        return response()->json([
            'success' => true,
            'count' => $risks->count(),
            'data' => $risks,
        ]);
    }
}
