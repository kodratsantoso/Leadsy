<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Sales\CompetitiveBattleCardService;
use App\Services\Sales\FunnelStageRecommendationService;
use App\Services\Sales\StalledDealDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Sprint2EngagementController extends Controller
{
    /**
     * List stalled deals and recovery playbooks.
     */
    public function getStalledDeals(Request $request, StalledDealDetectionService $service): JsonResponse
    {
        $threshold = $request->query('days') ? (int) $request->query('days') : null;
        $report = $service->detectStalledLeads($threshold);

        return response()->json([
            'success' => true,
            'count' => $report->count(),
            'data' => $report,
        ]);
    }

    /**
     * Trigger manual check for stalled deals.
     */
    public function runStalledDealCheck(Request $request, StalledDealDetectionService $service): JsonResponse
    {
        $threshold = $request->input('days') ? (int) $request->input('days') : null;
        $report = $service->detectStalledLeads($threshold);

        return response()->json([
            'success' => true,
            'message' => "Scan completed. Found {$report->count()} stalled deals.",
            'data' => $report,
        ]);
    }

    /**
     * Get AI stage transition recommendation for a lead.
     */
    public function getStageRecommendation(Lead $lead, FunnelStageRecommendationService $service): JsonResponse
    {
        $recommendation = $service->recommendStage($lead);

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'recommendation' => $recommendation,
        ]);
    }

    /**
     * Apply stage recommendation to lead.
     */
    public function applyStageRecommendation(
        Request $request,
        Lead $lead,
        FunnelStageRecommendationService $service
    ): JsonResponse {
        $targetStageId = $request->input('target_stage_id');
        $userId = $request->user()?->id;

        $result = $service->applyRecommendation($lead, $targetStageId, $userId);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * Get battle cards for a lead.
     */
    public function getBattleCards(Lead $lead): JsonResponse
    {
        $cards = $lead->battleCards()->latest()->get();

        return response()->json([
            'success' => true,
            'lead_id' => $lead->id,
            'count' => $cards->count(),
            'data' => $cards,
        ]);
    }

    /**
     * Generate or refresh battle card for a lead and competitor.
     */
    public function generateBattleCard(
        Request $request,
        Lead $lead,
        CompetitiveBattleCardService $service
    ): JsonResponse {
        $competitor = $request->input('competitor_name');
        $card = $service->generateBattleCard($lead, $competitor);

        return response()->json([
            'success' => true,
            'message' => "Battle card generated for competitor '{$card->competitor_name}'.",
            'data' => $card,
        ]);
    }
}
