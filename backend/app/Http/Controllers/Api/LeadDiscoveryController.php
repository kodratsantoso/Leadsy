<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadDiscoveryRecord;
use App\Services\AuditService;
use App\Services\Presales\DiscoveryCompletenessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadDiscoveryController extends Controller
{
    public function __construct(
        protected DiscoveryCompletenessService $completenessService
    ) {}

    /**
     * Get discovery record and completeness analysis for a lead.
     */
    public function show(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $record = $lead->discoveryRecord;
        $evaluation = $this->completenessService->evaluate($lead, $record);

        return response()->json([
            'data' => [
                'id' => $record?->id,
                'lead_id' => $lead->id,
                'sections' => $record?->sections ?? new \stdClass(),
                'field_sources' => $record?->field_sources ?? new \stdClass(),
                'qualification_status' => $record?->qualification_status ?? 'in_progress',
                'completeness_score' => $record?->completeness_score ?? $evaluation['score'],
                'last_validated_at' => $record?->last_validated_at?->toIso8601String(),
                'updated_at' => $record?->updated_at?->toIso8601String(),
            ],
            'evaluation' => $evaluation,
            'standard_sections' => LeadDiscoveryRecord::standardSections(),
        ]);
    }

    /**
     * Save or update discovery record and re-evaluate completeness.
     */
    public function update(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $validated = $request->validate([
            'sections' => 'nullable|array',
            'field_sources' => 'nullable|array',
            'qualification_status' => 'nullable|string|in:unqualified,in_progress,qualified,disqualified',
            'bantc' => 'nullable|array',
            'bantc.budget' => 'nullable|string',
            'bantc.authority' => 'nullable|string',
            'bantc.needs' => 'nullable|string',
            'bantc.timeline' => 'nullable|string',
            'bantc.competitor' => 'nullable|string',
        ]);

        if (array_key_exists('bantc', $validated) && is_array($validated['bantc'])) {
            $appliedFields = app(\App\Services\Lead\LeadBantcSyncService::class)->apply(
                $lead,
                $validated['bantc'],
                'manual'
            );

            if (in_array('competitor', $appliedFields, true) && \App\Services\Sales\CompetitiveBattleCardService::isMeaningfulCompetitorName($validated['bantc']['competitor'] ?? null)) {
                \App\Jobs\GenerateBattleCardJob::dispatch($lead->id, $validated['bantc']['competitor']);
            }

            $lead->refresh();
        }

        $record = LeadDiscoveryRecord::firstOrNew(['lead_id' => $lead->id]);

        $before = $record->exists ? $record->toArray() : null;

        if (array_key_exists('sections', $validated)) {
            $record->sections = $validated['sections'] ?? [];
        }

        if (array_key_exists('field_sources', $validated)) {
            $record->field_sources = $validated['field_sources'] ?? [];
        }

        if (array_key_exists('qualification_status', $validated)) {
            $record->qualification_status = $validated['qualification_status'];
        }

        if (! $record->exists) {
            $record->created_by = $request->user()?->id;
        }

        $record->updated_by = $request->user()?->id;
        $record->save();

        // Apply automatic completeness calculation and save
        $this->completenessService->applyEvaluation($record);

        AuditService::log(
            'lead_discovery_record_updated',
            'leads',
            $lead,
            $before,
            $record->toArray(),
            'success',
            ['completeness_score' => $record->completeness_score]
        );

        $evaluation = $this->completenessService->evaluate($lead, $record);

        return response()->json([
            'data' => [
                'id' => $record->id,
                'lead_id' => $lead->id,
                'sections' => $record->sections,
                'field_sources' => $record->field_sources,
                'qualification_status' => $record->qualification_status,
                'completeness_score' => $record->completeness_score,
                'last_validated_at' => $record->last_validated_at?->toIso8601String(),
                'updated_at' => $record->updated_at?->toIso8601String(),
            ],
            'evaluation' => $evaluation,
            'message' => 'Discovery workspace saved successfully.',
        ]);
    }

    /**
     * Run on-demand completeness audit without modifying content.
     */
    public function validateCompleteness(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $record = $lead->discoveryRecord;
        $evaluation = $this->completenessService->evaluate($lead, $record);

        if ($record) {
            $record->last_validated_at = now();
            $record->completeness_score = $evaluation['score'];
            $record->completeness_details = $evaluation;
            $record->save();
        }

        return response()->json([
            'evaluation' => $evaluation,
            'message' => 'Discovery completeness validated.',
        ]);
    }
}
