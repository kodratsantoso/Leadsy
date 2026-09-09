<?php

namespace App\Services\Sales;

use App\Models\Lead;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LeadSourceQualityService
{
    /**
     * Analyze and rank all lead acquisition sources by conversion, score, and efficiency.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function evaluateSourceQuality(): Collection
    {
        // Group leads by normalized channel or source
        $leads = Lead::with(['funnelStage', 'sources'])
            ->get();

        if ($leads->isEmpty()) {
            return collect();
        }

        // Categorize into canonical channel groups
        $grouped = $leads->groupBy(function ($lead) {
            $sourceType = $lead->sources->first()?->source_type 
                ?? ($lead->external_place_id ? 'google_maps' : null)
                ?? $lead->getAttribute('lead_source')
                ?? $lead->getAttribute('source_type')
                ?? 'other';

            $source = strtolower((string) $sourceType);

            if (str_contains($source, 'map') || str_contains($source, 'place')) {
                return 'Google Maps Discovery';
            }
            if (str_contains($source, 'whatsapp') || str_contains($source, 'wa')) {
                return 'WhatsApp Conversation';
            }
            if (str_contains($source, 'idx') || str_contains($source, 'bursa')) {
                return 'IDX Public Companies';
            }
            if (str_contains($source, 'lark')) {
                return 'Lark Base Integration';
            }
            if (str_contains($source, 'import') || str_contains($source, 'csv')) {
                return 'CSV Import';
            }
            if (str_contains($source, 'manual')) {
                return 'Direct Manual Creation';
            }

            return 'Outbound & Other';
        });

        $report = collect();

        foreach ($grouped as $channelName => $channelLeads) {
            $total = $channelLeads->count();
            $avgScore = round($channelLeads->avg('lead_score') ?? 0, 1);
            
            $qualifiedCount = $channelLeads->where('qualification_status', 'qualified')->count();
            $qualRate = $total > 0 ? round(($qualifiedCount / $total) * 100, 1) : 0;

            $wonCount = $channelLeads->filter(function ($lead) {
                $stageName = strtolower($lead->funnelStage?->name ?? '');
                return str_contains($stageName, 'won');
            })->count();
            $winRate = $total > 0 ? round(($wonCount / $total) * 100, 1) : 0;

            // Composite formula: Score (40%) + Qual Rate (30%) + Win Rate (30%)
            $qualityScore = round(($avgScore * 0.40) + ($qualRate * 0.30) + ($winRate * 0.30), 1);

            $grade = match (true) {
                $qualityScore >= 75 => 'A',
                $qualityScore >= 60 => 'B',
                $qualityScore >= 45 => 'C',
                default => 'D',
            };

            $recommendation = match ($grade) {
                'A' => 'High-yield channel. Scale pipeline investment and increase SDR allocation.',
                'B' => 'Steady healthy pipeline source. Maintain current acquisition velocity.',
                'C' => 'Moderate yield. Enhance initial discovery qualification criteria to filter low-fit leads.',
                default => 'Low conversion efficiency. Review scraping/targeting parameters or re-evaluate lead criteria.',
            };

            $report->push([
                'channel' => $channelName,
                'total_leads' => $total,
                'avg_lead_score' => $avgScore,
                'qualified_count' => $qualifiedCount,
                'qualification_rate_pct' => $qualRate,
                'won_count' => $wonCount,
                'win_rate_pct' => $winRate,
                'composite_quality_score' => $qualityScore,
                'quality_grade' => $grade,
                'strategic_recommendation' => $recommendation,
            ]);
        }

        return $report->sortByDesc('composite_quality_score')->values();
    }
}
