<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;

class PipelineQualityService
{
    public function getPipelineQuality(?int $territoryId = null): array
    {
        $base = Lead::query()->whereNull('deleted_at');
        if ($territoryId) {
            $base->where('territory_id', $territoryId);
        }

        $total = (clone $base)->count();
        $qualified = (clone $base)->where('qualification_status', 'eligible')->count();
        $ghosts = $this->countGhostLeads(clone $base);
        $avgScore = (clone $base)->avg('lead_score') ?? 0;
        $scoreDistribution = $this->scoreDistribution(clone $base, $total);
        $insights = $this->buildInsights(
            averageScore: round($avgScore, 1),
            qualifiedRatio: $total > 0 ? round($qualified / $total * 100, 1) : 0,
            ghostRatio: $total > 0 ? round($ghosts / $total * 100, 1) : 0,
            scoreDistribution: $scoreDistribution,
            sourceQuality: $this->getSourceQuality()
        );

        $qualifiedRatio = $total > 0 ? round($qualified / $total * 100, 1) : 0;
        $ghostRatio = $total > 0 ? round($ghosts / $total * 100, 1) : 0;

        // Quality score: 40% qualified ratio + ghost penalty + 30% normalised avg score
        $pqs = max(0, min(100,
            ($qualifiedRatio * 0.40) +
            (max(0, 30 - $ghostRatio) * 1.0) +
            ($avgScore * 0.30)
        ));

        return [
            'total_leads' => $total,
            'qualified_leads' => $qualified,
            'ghost_leads' => $ghosts,
            'qualified_ratio' => $qualifiedRatio,
            'ghost_lead_ratio' => $ghostRatio,
            'average_score' => round($avgScore, 1),
            'pipeline_quality_score' => round($pqs, 1),
            'health' => $this->healthLevel($pqs),
            'by_status' => $this->byStatus(clone $base),
            'by_score_band' => $this->byScoreBand(clone $base),
            'score_distribution' => $scoreDistribution,
            'insights' => $insights,
        ];
    }

    public function getSourceQuality(): array
    {
        $rows = DB::table('lead_sources')
            ->join('leads', function ($j) {
                $j->on('lead_sources.lead_id', '=', 'leads.id')
                    ->whereNull('leads.deleted_at');
            })
            ->selectRaw(
                'lead_sources.source_type,
                 COUNT(DISTINCT lead_sources.lead_id) as total_leads,
                 ROUND(AVG(leads.lead_score)::numeric, 1) as avg_score,
                 SUM(CASE WHEN leads.qualification_status = \'eligible\' THEN 1 ELSE 0 END) as qualified_count'
            )
            ->groupBy('lead_sources.source_type')
            ->get();

        return $rows->map(function ($row) {
            $conv = $row->total_leads > 0
                ? round($row->qualified_count / $row->total_leads * 100, 1)
                : 0;

            return [
                'source_type' => $row->source_type,
                'total_leads' => (int) $row->total_leads,
                'avg_score' => (float) $row->avg_score,
                'qualified_count' => (int) $row->qualified_count,
                'conversion_rate' => $conv,
            ];
        })->sortByDesc('conversion_rate')->values()->toArray();
    }

    private function countGhostLeads($query): int
    {
        return (clone $query)
            ->where('lead_score', '<', 20)
            ->where('created_at', '<', now()->subDays(14))
            ->whereDoesntHave('contacts')
            ->whereDoesntHave('activities')
            ->count();
    }

    private function byStatus($query): array
    {
        return (clone $query)
            ->selectRaw('qualification_status, COUNT(*) as count')
            ->groupBy('qualification_status')
            ->pluck('count', 'qualification_status')
            ->toArray();
    }

    private function byScoreBand($query): array
    {
        $leads = (clone $query)->pluck('lead_score');

        return [
            'hot' => $leads->filter(fn ($s) => $s >= 80)->count(),
            'warm' => $leads->filter(fn ($s) => $s >= 60 && $s < 80)->count(),
            'cold' => $leads->filter(fn ($s) => $s < 60)->count(),
        ];
    }

    private function scoreDistribution($query, int $total): array
    {
        $bands = $this->byScoreBand($query);

        return collect($bands)->map(function ($count, $band) use ($total) {
            return [
                'band' => $band,
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
            ];
        })->values()->toArray();
    }

    private function buildInsights(
        float $averageScore,
        float $qualifiedRatio,
        float $ghostRatio,
        array $scoreDistribution,
        array $sourceQuality
    ): array {
        $insights = [];

        if ($averageScore < 60) {
            $insights[] = 'Average lead score is below the pipeline threshold, so acquisition quality needs attention.';
        } elseif ($averageScore >= 80) {
            $insights[] = 'Average lead score is in the Hot band, which indicates strong upstream filtering.';
        } else {
            $insights[] = 'Average lead score is serviceable, but there is still room to improve lead fit before handoff.';
        }

        if ($qualifiedRatio < 40) {
            $insights[] = 'Less than 40% of leads are qualified, so the funnel is carrying too much noise.';
        } else {
            $insights[] = 'Qualified lead share is holding up, which supports healthier pipeline conversion.';
        }

        if ($ghostRatio > 15) {
            $insights[] = 'Ghost lead ratio is elevated, which suggests stale or incomplete records are still entering the system.';
        }

        $coldBand = collect($scoreDistribution)->firstWhere('band', 'cold');
        if (($coldBand['percentage'] ?? 0) >= 40) {
            $insights[] = 'Cold leads make up a large portion of the database, so review gating and score-based filtering should stay strict.';
        }

        $topSource = collect($sourceQuality)->sortByDesc('conversion_rate')->first();
        if ($topSource) {
            $insights[] = sprintf(
                '%s is currently the strongest source at %.1f%% qualified conversion with an average score of %.1f.',
                str_replace('_', ' ', ucfirst((string) $topSource['source_type'])),
                (float) $topSource['conversion_rate'],
                (float) $topSource['avg_score']
            );
        }

        return array_values(array_slice($insights, 0, 4));
    }

    private function healthLevel(float $score): string
    {
        if ($score >= 70) {
            return 'healthy';
        }
        if ($score >= 50) {
            return 'warning';
        }

        return 'critical';
    }
}
