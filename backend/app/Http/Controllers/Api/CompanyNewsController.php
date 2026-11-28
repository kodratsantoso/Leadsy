<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadCompanyNews;
use App\Services\AuditService;
use App\Services\Lead\CompanyNewsDiscoveryService;
use App\Services\Lead\CompanyNewsIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyNewsController extends Controller
{
    private function currentTenantId(Request $request): ?int
    {
        return $request->user()?->tenant_id
            ?? auth('sanctum')->user()?->tenant_id;
    }

    /**
     * Get all news, signals, and latest intelligence analysis for a lead.
     */
    public function index(Request $request, Lead $lead): JsonResponse
    {
        $news = $lead->companyNews()
            ->orderByDesc('published_at')
            ->get();

        $signals = $lead->businessSignals()->get();
        $latestAnalysis = $lead->latestNewsIntelligence()->first();

        $stats = [
            'total_news' => $news->count(),
            'high_relevance_count' => $news->where('relevance_score', '>=', 80)->count(),
            'opportunity_count' => $signals->where('sentiment', 'positive')->count(),
            'risk_count' => $signals->where('sentiment', 'negative')->count(),
            'has_analysis' => $latestAnalysis !== null,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'news' => $news,
                'signals' => $signals,
                'latest_analysis' => $latestAnalysis,
                'stats' => $stats,
            ],
        ]);
    }

    /**
     * Trigger external news discovery.
     */
    public function discover(Request $request, Lead $lead, CompanyNewsDiscoveryService $service): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);
        $result = $service->discover($lead, $tenantId);

        AuditService::log('company_news_discovered', 'leads', $lead, null, [
            'count' => $result['count'] ?? 0,
            'source' => $result['source'] ?? 'none',
        ]);

        return response()->json($result);
    }

    /**
     * Trigger AI business signals & sales intelligence analysis.
     */
    public function analyze(Request $request, Lead $lead, CompanyNewsIntelligenceService $service): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);
        $result = $service->analyze($lead, $tenantId);

        if ($result['success']) {
            AuditService::log('company_news_analyzed', 'leads', $lead, null, [
                'signals_count' => count($result['signals'] ?? []),
            ]);
        }

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * User toggles relevance or exclusion of a specific news article.
     */
    public function updateRelevance(Request $request, Lead $lead, LeadCompanyNews $news): JsonResponse
    {
        if ($news->lead_id !== $lead->id) {
            return response()->json(['success' => false, 'message' => 'Article does not belong to this lead.'], 403);
        }

        $validated = $request->validate([
            'is_relevant' => 'nullable|boolean',
            'is_excluded' => 'nullable|boolean',
        ]);

        $news->update($validated);

        return response()->json([
            'success' => true,
            'data' => $news,
            'message' => 'Status artikel berhasil diperbarui.',
        ]);
    }

    /**
     * Apply selected news pitching angle to the lead's Pre-Meeting Brief.
     */
    public function applyToBrief(Request $request, Lead $lead, CompanyNewsIntelligenceService $service): JsonResponse
    {
        $validated = $request->validate([
            'angle' => 'required|array',
            'angle.angle_title' => 'required|string',
            'angle.icebreaker' => 'nullable|string',
            'angle.value_prop' => 'nullable|string',
            'angle.target_stakeholder' => 'nullable|string',
        ]);

        $res = $service->applyToBrief($lead, $validated['angle']);

        AuditService::log('company_news_pitching_applied_to_brief', 'leads', $lead, null, [
            'angle_title' => $validated['angle']['angle_title'],
        ]);

        return response()->json($res);
    }
}
