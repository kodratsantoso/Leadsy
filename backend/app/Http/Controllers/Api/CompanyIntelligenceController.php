<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\CompanyVerification;
use App\Services\Lead\CompanyVerificationService;
use App\Services\Idx\IdxIntelligenceService;
use App\Services\Lead\CompanyFinancialAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyIntelligenceController extends Controller
{
    public function __construct(
        private CompanyVerificationService $verificationService,
        private IdxIntelligenceService $idxService,
        private CompanyFinancialAnalysisService $financialService
    ) {}

    /**
     * GET /api/leads/{lead}/verification
     */
    public function getVerification(Lead $lead): JsonResponse
    {
        $verification = $lead->verifications()->with('evidences')->latest()->first();

        return response()->json([
            'data' => [
                'verification' => $verification,
                'aliases' => $lead->aliases,
                'idx_profile' => $lead->idxCompanyProfile,
            ]
        ]);
    }

    /**
     * POST /api/leads/{lead}/verification/run
     */
    public function runVerification(Lead $lead): JsonResponse
    {
        // 1. Resolve & Verify legal entity
        $verification = $this->verificationService->verifyLead($lead);

        // 2. Perform IDX listed company validation
        $this->idxService->enrichListedCompany($lead);

        // 3. Populate financial statements cache and capacity signals
        $this->financialService->analyzeFinancials($lead);

        // Reload data to return fresh state
        $lead->load(['idxCompanyProfile', 'aliases']);
        $verification->load('evidences');

        return response()->json([
            'message' => 'Company identity verification and public intel run complete',
            'data' => [
                'verification' => $verification,
                'aliases' => $lead->aliases,
                'idx_profile' => $lead->idxCompanyProfile,
            ]
        ]);
    }

    /**
     * GET /api/leads/{lead}/financials
     */
    public function getFinancials(Lead $lead): JsonResponse
    {
        $snapshots = $lead->financialSnapshots()->orderBy('fiscal_year')->orderBy('metric')->get();
        $signals = $lead->intelligenceSignals()->get();

        return response()->json([
            'data' => [
                'snapshots' => $snapshots,
                'signals' => $signals,
            ]
        ]);
    }

    /**
     * POST /api/leads/{lead}/verification/resolve-conflict
     */
    public function resolveConflict(Request $request, Lead $lead): JsonResponse
    {
        $request->validate([
            'override_value' => 'required|string|max:255',
            'override_type' => 'required|string|in:legal_name,brand,parent_company',
            'justification' => 'nullable|string',
        ]);

        // Create or update manual verified alias with overrides (manual overrides priority)
        $lead->aliases()->updateOrCreate(
            [
                'alias_type' => $request->override_type,
                'alias_value' => $request->override_value,
            ],
            [
                'source' => 'MANUAL_OVERRIDE_CONFLICT_RESOLVED',
                'verified' => true,
            ]
        );

        // Update the main Lead table property based on override (if applicable)
        if ($request->override_type === 'legal_name') {
            $lead->update(['company_name' => $request->override_value]);
        } elseif ($request->override_type === 'brand') {
            $lead->update(['brand' => $request->override_value]);
        }

        // Add manual evidence log
        $verification = $lead->verifications()->latest()->first();
        if ($verification) {
            $verification->evidences()->create([
                'source_type' => 'manual',
                'source_name' => 'Human Auditor Conflict Resolution',
                'evidence_type' => 'registration',
                'raw_value' => $request->justification ?? 'Manual review decision override',
                'normalized_value' => "Manual selection of {$request->override_type}: {$request->override_value}",
                'confidence' => 100, // Manual human override has 100% confidence
                'retrieved_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Conflict manually resolved successfully',
            'aliases' => $lead->aliases,
        ]);
    }
}
