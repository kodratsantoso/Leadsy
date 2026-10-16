<?php

namespace App\Services\Presales;

use App\Models\Lead;
use App\Models\LeadDiscoveryRecord;

class DiscoveryCompletenessService
{
    /**
     * Evaluate discovery completeness and readiness for solution architecture design.
     *
     * @return array{
     *     score: int,
     *     is_ready_for_solution_design: bool,
     *     completed_count: int,
     *     total_count: int,
     *     missing_required: array<string>,
     *     checklist: array<int, array<string, mixed>>,
     *     provenance_counts: array{confirmed: int, assumption: int, ai_suggested: int, unspecified: int},
     *     bantc_status: array<string, mixed>
     * }
     */
    public function evaluate(Lead $lead, ?LeadDiscoveryRecord $record = null): array
    {
        $standardSections = LeadDiscoveryRecord::standardSections();
        $sections = $record?->sections ?? [];
        $fieldSources = $record?->field_sources ?? [];

        $checklist = [];
        $missingRequired = [];
        $totalItems = count($standardSections) + 5; // +5 for BANTC (Budget, Authority, Needs, Timeline, Competitor)
        $completedItems = 0;

        $provenanceCounts = [
            'confirmed' => 0,
            'assumption' => 0,
            'ai_suggested' => 0,
            'unspecified' => 0,
        ];

        // 1. Evaluate BANTC from Lead model
        $bantFields = [
            'budget' => ['label' => 'BANTC: Budget', 'value' => $lead->budget],
            'authority' => ['label' => 'BANTC: Authority / Decision Maker', 'value' => $lead->authority],
            'needs' => ['label' => 'BANTC: Needs & Requirements', 'value' => $lead->needs],
            'timeline' => ['label' => 'BANTC: Target Timeline', 'value' => $lead->timeline],
            'competitor' => ['label' => 'BANTC: Competitor / Alternatives', 'value' => $lead->competitor],
        ];

        $bantcSources = is_array($lead->bantc_sources) ? $lead->bantc_sources : [];
        $normalizedSources = [];

        foreach ($bantFields as $key => $meta) {
            $isFilled = ! empty(trim((string) $meta['value']));
            $rawEntry = $bantcSources[$key] ?? null;
            $provSource = is_array($rawEntry) ? ($rawEntry['source'] ?? null) : $rawEntry;
            $prov = $provSource ?? ($isFilled ? 'confirmed' : 'unspecified');
            $normalizedSources[$key] = $prov;

            if ($isFilled) {
                $completedItems++;
                $normProv = match ($prov) {
                    'ai', 'ai_suggested' => 'ai_suggested',
                    'assumption' => 'assumption',
                    default => 'confirmed',
                };
                $provenanceCounts[$normProv]++;
            } else {
                $missingRequired[] = "bant_{$key}";
            }

            $checklist[] = [
                'key' => "bant_{$key}",
                'label' => $meta['label'],
                'category' => 'qualification',
                'required' => true,
                'status' => $isFilled ? 'completed' : 'incomplete',
                'provenance' => $isFilled ? $prov : 'unspecified',
                'value' => $meta['value'] ?: null,
            ];
        }

        // 2. Evaluate Standard Discovery Sections
        foreach ($standardSections as $key => $meta) {
            $val = $sections[$key] ?? null;
            $isFilled = false;

            if (is_string($val)) {
                $isFilled = ! empty(trim($val));
            } elseif (is_array($val)) {
                $isFilled = count(array_filter($val)) > 0;
            }

            $provenance = $fieldSources[$key] ?? null;

            if ($isFilled) {
                $completedItems++;
                $normProv = match ($provenance) {
                    'confirmed' => 'confirmed',
                    'assumption' => 'assumption',
                    'ai_suggested' => 'ai_suggested',
                    default => 'unspecified',
                };
                $provenanceCounts[$normProv]++;
            } elseif ($meta['required']) {
                $missingRequired[] = $key;
            }

            $checklist[] = [
                'key' => $key,
                'label' => $meta['label'],
                'category' => $meta['category'],
                'required' => $meta['required'],
                'description' => $meta['description'],
                'status' => $isFilled ? 'completed' : 'incomplete',
                'provenance' => $isFilled ? ($provenance ?: 'unspecified') : 'unspecified',
                'value' => $isFilled ? $val : null,
            ];
        }

        // 3. Compute Weighted Score
        // Base ratio (completed / total) = 85 points max
        $baseRatio = $totalItems > 0 ? ($completedItems / $totalItems) : 0;
        $baseScore = round($baseRatio * 85);

        // Quality bonus (up to 15 points) for verified confirmed items
        $qualityBonus = 0;
        if ($completedItems > 0) {
            $confirmedRatio = $provenanceCounts['confirmed'] / $completedItems;
            $qualityBonus = round($confirmedRatio * 15);
        }

        $finalScore = min(100, (int) ($baseScore + $qualityBonus));

        // Readiness for Solution Design: requires >= 60% and no critical missing items in core requirements
        $criticalSections = ['business_objectives', 'functional_requirements', 'bant_needs', 'bant_authority'];
        $hasCriticalGaps = count(array_intersect($missingRequired, $criticalSections)) > 0;
        $isReady = $finalScore >= 60 && ! $hasCriticalGaps;

        return [
            'score' => $finalScore,
            'is_ready_for_solution_design' => $isReady,
            'completed_count' => $completedItems,
            'total_count' => $totalItems,
            'missing_required' => $missingRequired,
            'checklist' => $checklist,
            'provenance_counts' => $provenanceCounts,
            'bantc_status' => [
                'budget' => $lead->budget,
                'authority' => $lead->authority,
                'needs' => $lead->needs,
                'timeline' => $lead->timeline,
                'competitor' => $lead->competitor,
                'sources' => $normalizedSources,
                'raw_sources' => $bantcSources,
            ],
        ];
    }

    /**
     * Evaluate and persist completeness details into the discovery record.
     */
    public function applyEvaluation(LeadDiscoveryRecord $record): LeadDiscoveryRecord
    {
        $evaluation = $this->evaluate($record->lead, $record);

        $record->completeness_score = $evaluation['score'];
        $record->completeness_details = $evaluation;
        $record->last_validated_at = now();
        $record->save();

        return $record;
    }
}
