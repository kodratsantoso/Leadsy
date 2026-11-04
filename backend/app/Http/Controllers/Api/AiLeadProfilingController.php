<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiGeneratedOutput;
use App\Models\Lead;
use App\Models\LeadOfficeLocation;
use App\Services\AuditService;
use App\Services\Lead\AiLeadProfilingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiLeadProfilingController extends Controller
{
    public function __construct(
        private readonly AiLeadProfilingService $profilingService
    ) {}

    /**
     * POST /api/leads/ai-profiling/start
     */
    public function start(Request $request): JsonResponse
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'website' => 'nullable|string|max:255',
            'lead_id' => 'nullable|integer',
        ]);

        $companyName = (string) $request->input('company_name');
        $website = $request->filled('website') ? (string) $request->input('website') : null;
        $leadId = $request->filled('lead_id') ? (int) $request->input('lead_id') : null;
        $userId = $request->user()?->id;

        if ($request->boolean('sync')) {
            @set_time_limit(120);
            $output = $this->profilingService->startProfilingSync($companyName, $website, $leadId, $userId);
        } else {
            $output = $this->profilingService->startProfiling($companyName, $website, $leadId, $userId);
        }

        return response()->json([
            'success' => true,
            'data' => $output,
        ]);
    }

    /**
     * GET /api/leads/ai-profiling/{id}/status
     */
    public function status(Request $request, int $id): JsonResponse
    {
        $output = AiGeneratedOutput::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $output,
        ]);
    }

    /**
     * POST /api/leads/{lead}/ai-profiling/run
     *
     * Runs full AI Deep Profiling directly on an existing Lead, persists scalar
     * firmographics, `ai_profile_json`, relational `lead_office_locations`, and
     * seeds empty Presales Discovery & BANTC questions.
     */
    public function runForLead(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        @set_time_limit(120);

        try {
            $profileData = $this->profilingService->profileAndEnrichLead($lead);
            $lead->refresh()->load(['industry', 'subIndustry', 'businessCategory', 'officeLocations', 'discoveryRecord']);

            AuditService::log(
                'ai_lead_deep_profiled',
                'leads',
                $lead,
                null,
                [
                    'legal_name' => $lead->legal_name,
                    'ownership_type' => $lead->ownership_type,
                    'office_locations_count' => $lead->officeLocations->count(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'AI Deep Profiling berhasil dijalankan dan disimpan ke profil perusahaan.',
                'data' => [
                    'lead' => $lead,
                    'profile' => $profileData,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Gagal menjalankan AI Deep Profiling.',
            ], 422);
        }
    }

    /**
     * POST /api/leads/{lead}/ai-profiling/sync-playbook
     *
     * Explicitly pushes AI Profiling `sales_notes` & `discovery_questions` into
     * `lead_discovery_records` (non-destructive to `confirmed` sections) and
     * `lead_bantc_question_guides`.
     */
    public function syncPlaybook(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $profileData = is_array($lead->ai_profile_json) ? $lead->ai_profile_json : [];
        if (empty($profileData)) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada data AI Deep Profile pada lead ini. Jalankan AI Profiling terlebih dahulu.',
            ], 422);
        }

        $summary = $this->profilingService->hydrateLeadFromProfile(
            $lead,
            $profileData,
            null,
            $request->user()?->id,
            true
        );

        AuditService::log(
            'ai_profiling_playbook_synced',
            'leads',
            $lead,
            null,
            $summary
        );

        return response()->json([
            'success' => true,
            'message' => 'Insights AI Profiling berhasil disinkronkan ke Discovery Workspace & BANTC Question Guide.',
            'data' => $summary,
        ]);
    }

    /**
     * POST /api/leads/{lead}/office-locations
     */
    public function storeOfficeLocation(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $validated = $request->validate([
            'location_type' => 'nullable|string|max:80',
            'label' => 'nullable|string|max:180',
            'address' => 'nullable|string|max:1000',
            'city' => 'required_without_all:address,label|nullable|string|max:120',
            'province' => 'nullable|string|max:120',
            'country' => 'nullable|string|max:100',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'is_primary' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_primary'])) {
            LeadOfficeLocation::where('lead_id', $lead->id)->update(['is_primary' => false]);
        }

        $location = LeadOfficeLocation::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'location_type' => $validated['location_type'] ?? 'Branch / Site',
            'label' => $validated['label'] ?? (! empty($validated['city']) ? "{$validated['city']} Office" : null),
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'province' => $validated['province'] ?? null,
            'country' => $validated['country'] ?? 'Indonesia',
            'lat' => $validated['lat'] ?? null,
            'lng' => $validated['lng'] ?? null,
            'source' => 'manual',
            'is_primary' => (bool) ($validated['is_primary'] ?? false),
        ]);

        $totalLocations = LeadOfficeLocation::where('lead_id', $lead->id)->count();
        if ($lead->branch_count === null || $lead->branch_count < $totalLocations) {
            $lead->update(['branch_count' => $totalLocations]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lokasi kantor/cabang berhasil ditambahkan.',
            'data' => $location,
        ], 201);
    }

    /**
     * DELETE /api/leads/{lead}/office-locations/{location}
     */
    public function destroyOfficeLocation(Request $request, Lead $lead, LeadOfficeLocation $location): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        if ((int) $location->lead_id !== (int) $lead->id) {
            abort(404);
        }

        $location->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lokasi kantor/cabang berhasil dihapus.',
        ]);
    }
}
