<?php

namespace App\Services\Revenue;

use App\Models\IcpProfile;
use App\Models\Lead;
use App\Models\LeadIcpConfig;
use App\Models\LeadIcpMatch;
use Illuminate\Support\Str;

class ICPMatchingService
{
    public function matchLead(Lead $lead, ?IcpProfile $profile = null): array
    {
        $lead->loadMissing('contacts', 'industry', 'territory');

        $profile ??= IcpProfile::query()
            ->when(
                $lead->tenant_id,
                fn ($query) => $query->where(function ($inner) use ($lead) {
                    $inner->where('tenant_id', $lead->tenant_id)
                        ->orWhereNull('tenant_id');
                }),
                fn ($query) => $query->whereNull('tenant_id')
            )
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $configRows = LeadIcpConfig::query()
            ->when(
                $lead->tenant_id,
                fn ($query) => $query->where(function ($inner) use ($lead) {
                    $inner->where('tenant_id', $lead->tenant_id)
                        ->orWhereNull('tenant_id');
                }),
                fn ($query) => $query->whereNull('tenant_id')
            )
            ->orderByDesc('priority_weight')
            ->get();

        if ($configRows->isNotEmpty()) {
            $result = $this->matchAgainstConfigRows($lead, $configRows, $profile);
        } elseif ($profile) {
            $result = $this->matchAgainstLegacyProfile($lead, $profile);
        } else {
            return [
                'matched' => false,
                'icp_score' => 0,
                'match_score' => 0,
                'match_status' => 'weak_match',
                'match_level' => 'weak_match',
                'reasoning' => 'No ICP config or active ICP profile is configured.',
                'score_breakdown' => [],
            ];
        }

        if ($profile) {
            LeadIcpMatch::updateOrCreate(
                ['lead_id' => $lead->id, 'icp_profile_id' => $profile->id],
                [
                    'match_score' => $result['icp_score'],
                    'match_level' => $result['match_status'],
                    'score_breakdown' => [
                        'reasoning' => $result['reasoning'],
                        'factors' => $result['score_breakdown'],
                        'source' => $result['config_source'],
                        'matched_config' => $result['matched_config'] ?? null,
                    ],
                    'evaluated_at' => now(),
                ]
            );
        }

        return $result;
    }

    public function batchMatch(IcpProfile $profile): int
    {
        $count = 0;

        Lead::whereNull('deleted_at')->chunkById(100, function ($leads) use ($profile, &$count) {
            foreach ($leads as $lead) {
                $this->matchLead($lead, $profile);
                $count++;
            }
        });

        return $count;
    }

    private function matchAgainstConfigRows(Lead $lead, $configRows, ?IcpProfile $profile): array
    {
        $evaluations = $configRows->map(function (LeadIcpConfig $config) use ($lead) {
            $breakdown = [
                $this->evaluateIndustryFit($lead, $config->industry),
                $this->evaluateSizeFit($lead, $config->size_range),
                $this->evaluateLocationFit($lead, $config->location),
            ];

            $baseScore = round(collect($breakdown)->sum('weighted_score'), 2);
            $priorityWeight = (float) ($config->priority_weight ?? 0);
            $priorityBoost = min(10.0, round($priorityWeight * 0.1, 2));
            $finalScore = (int) round(min(100, $baseScore + $priorityBoost));

            return [
                'config' => $config,
                'score' => $finalScore,
                'breakdown' => $breakdown,
                'priority_boost' => $priorityBoost,
            ];
        })->sortByDesc('score')->values();

        $best = $evaluations->first();
        $status = $this->statusFromScore($best['score']);
        $matchedConfig = $best['config'];

        $breakdown = array_merge($best['breakdown'], [[
            'factor' => 'priority_weight',
            'input' => (string) $matchedConfig->priority_weight,
            'raw_score' => min(100, (int) round((float) $matchedConfig->priority_weight)),
            'weight' => 0,
            'weighted_score' => $best['priority_boost'],
            'reason' => "Priority weight contributed a {$best['priority_boost']} point tie-break boost.",
        ]]);

        return [
            'matched' => true,
            'icp_profile' => $profile?->name ?? 'Lead ICP Config',
            'icp_profile_id' => $profile?->id,
            'icp_score' => $best['score'],
            'match_score' => $best['score'],
            'match_status' => $status,
            'match_level' => $status,
            'reasoning' => $this->buildReasoning($breakdown, $status),
            'score_breakdown' => $breakdown,
            'config_source' => 'lead_icp_config',
            'matched_config' => [
                'id' => $matchedConfig->id,
                'industry' => $matchedConfig->industry,
                'size_range' => $matchedConfig->size_range,
                'location' => $matchedConfig->location,
                'priority_weight' => $matchedConfig->priority_weight,
            ],
        ];
    }

    private function matchAgainstLegacyProfile(Lead $lead, IcpProfile $profile): array
    {
        $breakdown = [
            $this->legacyIndustryFactor($lead, $profile),
            $this->legacyCompanySizeFactor($lead, $profile),
            $this->legacyTerritoryFactor($lead, $profile),
            $this->legacyContactFactor($lead, $profile),
            $this->legacyLeadScoreFactor($lead, $profile),
        ];

        $matchScore = (int) round(collect($breakdown)->sum('weighted_score'));
        $status = $this->statusFromScore($matchScore);

        return [
            'matched' => true,
            'icp_profile' => $profile->name,
            'icp_profile_id' => $profile->id,
            'icp_score' => $matchScore,
            'match_score' => $matchScore,
            'match_status' => $status,
            'match_level' => $status,
            'reasoning' => $this->buildReasoning($breakdown, $status),
            'score_breakdown' => $breakdown,
            'config_source' => 'icp_profiles',
        ];
    }

    private function evaluateIndustryFit(Lead $lead, string $targetIndustry): array
    {
        $leadIndustry = trim((string) ($lead->industry?->name ?? $lead->business_category ?? ''));
        $targetIndustry = trim($targetIndustry);

        if ($leadIndustry === '') {
            return $this->factor('industry', 'unknown', 0, 45, 'Lead industry is missing.');
        }

        if (Str::lower($leadIndustry) === Str::lower($targetIndustry)) {
            return $this->factor('industry', $leadIndustry, 100, 45, "Exact industry match with {$targetIndustry}.");
        }

        if (
            Str::contains(Str::lower($leadIndustry), Str::lower($targetIndustry)) ||
            Str::contains(Str::lower($targetIndustry), Str::lower($leadIndustry))
        ) {
            return $this->factor('industry', $leadIndustry, 60, 45, "Partial industry overlap with {$targetIndustry}.");
        }

        return $this->factor('industry', $leadIndustry, 15, 45, "Industry does not align with {$targetIndustry}.");
    }

    private function evaluateSizeFit(Lead $lead, ?string $sizeRange): array
    {
        $leadSize = $this->normalizeSizeBand((string) ($lead->company_size_estimate ?? ''));

        if ($leadSize === null) {
            return $this->factor('company_size', 'unknown', 40, 30, 'Lead company size is not known.');
        }

        $targets = $this->parseSizeRange((string) $sizeRange);

        if ($targets === []) {
            return $this->factor('company_size', $leadSize, 60, 30, 'ICP config has no company size range.');
        }

        if (in_array($leadSize, $targets, true)) {
            return $this->factor('company_size', $leadSize, 100, 30, "Company size fits configured range {$sizeRange}.");
        }

        if ($this->isAdjacentSize($leadSize, $targets)) {
            return $this->factor('company_size', $leadSize, 65, 30, "Company size is near configured range {$sizeRange}.");
        }

        return $this->factor('company_size', $leadSize, 20, 30, "Company size is outside configured range {$sizeRange}.");
    }

    private function evaluateLocationFit(Lead $lead, ?string $targetLocation): array
    {
        $leadLocation = trim(implode(' | ', array_filter([
            $lead->territory?->name,
            $lead->address,
        ])));

        if ($leadLocation === '') {
            return $this->factor('location', 'unknown', 0, 25, 'Lead location is missing.');
        }

        if (! $targetLocation) {
            return $this->factor('location', $leadLocation, 60, 25, 'ICP config has no target location.');
        }

        if (Str::contains(Str::lower($leadLocation), Str::lower($targetLocation))) {
            return $this->factor('location', $leadLocation, 100, 25, "Lead is in target location {$targetLocation}.");
        }

        return $this->factor('location', $leadLocation, 20, 25, "Lead is outside target location {$targetLocation}.");
    }

    private function legacyIndustryFactor(Lead $lead, IcpProfile $profile): array
    {
        $rawScore = empty($profile->target_industries)
            ? 100
            : (in_array($lead->industry_id, $profile->target_industries, true) ? 100 : 20);

        return $this->factor(
            'industry',
            (string) ($lead->industry?->name ?? 'unknown'),
            $rawScore,
            $profile->weight_industry * 100,
            empty($profile->target_industries)
                ? 'Legacy ICP profile has no industry restriction.'
                : 'Industry compared against legacy ICP profile target industries.'
        );
    }

    private function legacyCompanySizeFactor(Lead $lead, IcpProfile $profile): array
    {
        $size = $this->normalizeSizeBand((string) ($lead->company_size_estimate ?? '')) ?? 'unknown';
        $targets = $profile->target_company_sizes ?? [];

        $rawScore = empty($targets)
            ? 100
            : (in_array($size, $targets, true) ? 100 : ($this->isAdjacentSize($size, $targets) ? 65 : 20));

        return $this->factor(
            'company_size',
            $size,
            $rawScore,
            $profile->weight_company_size * 100,
            empty($targets)
                ? 'Legacy ICP profile has no company size restriction.'
                : 'Company size compared against legacy ICP profile target sizes.'
        );
    }

    private function legacyTerritoryFactor(Lead $lead, IcpProfile $profile): array
    {
        $targets = $profile->target_territories ?? [];
        $rawScore = empty($targets)
            ? 100
            : (in_array($lead->territory_id, $targets, true) ? 100 : 20);

        return $this->factor(
            'location',
            (string) ($lead->territory?->name ?? $lead->address ?? 'unknown'),
            $rawScore,
            $profile->weight_territory * 100,
            empty($targets)
                ? 'Legacy ICP profile has no territory restriction.'
                : 'Location compared against legacy ICP profile target territories.'
        );
    }

    private function legacyContactFactor(Lead $lead, IcpProfile $profile): array
    {
        $contactScore = 0;
        if (! empty($lead->email)) {
            $contactScore += 35;
        }
        if (! empty($lead->phone)) {
            $contactScore += 35;
        }
        if ($lead->contacts->isNotEmpty()) {
            $contactScore += 30;
        }

        return $this->factor(
            'contact_availability',
            $lead->contacts->isNotEmpty() ? 'contacts available' : 'limited contact',
            min(100, $contactScore),
            $profile->weight_contact_info * 100,
            'Legacy ICP profile contact completeness factor.'
        );
    }

    private function legacyLeadScoreFactor(Lead $lead, IcpProfile $profile): array
    {
        $score = min(100, (int) ($lead->lead_score ?? 0));

        return $this->factor(
            'lead_score',
            (string) $score,
            $score,
            $profile->weight_lead_score * 100,
            'Existing deterministic lead score reused as a legacy ICP factor.'
        );
    }

    private function factor(string $name, string $input, int $rawScore, float $weight, string $reason): array
    {
        return [
            'factor' => $name,
            'input' => $input,
            'raw_score' => $rawScore,
            'weight' => round($weight, 2),
            'weighted_score' => round(($rawScore / 100) * $weight, 2),
            'reason' => $reason,
        ];
    }

    private function statusFromScore(int $score): string
    {
        return match (true) {
            $score >= 80 => 'strong_match',
            $score >= 55 => 'partial_match',
            default => 'weak_match',
        };
    }

    private function buildReasoning(array $breakdown, string $status): string
    {
        $strong = collect($breakdown)
            ->where('raw_score', '>=', 80)
            ->pluck('factor')
            ->map(fn ($factor) => str_replace('_', ' ', $factor))
            ->take(2)
            ->values()
            ->all();

        $weak = collect($breakdown)
            ->where('raw_score', '<', 50)
            ->pluck('factor')
            ->map(fn ($factor) => str_replace('_', ' ', $factor))
            ->take(2)
            ->values()
            ->all();

        $intro = match ($status) {
            'strong_match' => 'Lead is a strong ICP match.',
            'partial_match' => 'Lead is a partial ICP match.',
            default => 'Lead is a weak ICP match.',
        };

        $parts = [$intro];

        if ($strong !== []) {
            $parts[] = 'Strong fit on '.$this->joinList($strong).'.';
        }

        if ($weak !== []) {
            $parts[] = 'Weak fit on '.$this->joinList($weak).'.';
        }

        return implode(' ', $parts);
    }

    private function joinList(array $items): string
    {
        return match (count($items)) {
            0 => 'none',
            1 => $items[0],
            2 => $items[0].' and '.$items[1],
            default => implode(', ', array_slice($items, 0, -1)).', and '.end($items),
        };
    }

    private function normalizeSizeBand(string $value): ?string
    {
        $value = Str::lower(trim($value));

        if ($value === '') {
            return null;
        }

        return match (true) {
            Str::contains($value, 'micro') => 'micro',
            Str::contains($value, 'small') => 'small',
            Str::contains($value, 'medium') => 'medium',
            Str::contains($value, 'large') => 'large',
            Str::contains($value, 'enterprise') => 'enterprise',
            default => $value,
        };
    }

    private function parseSizeRange(string $value): array
    {
        $tokens = preg_split('/[^a-zA-Z]+/', Str::lower($value)) ?: [];

        return collect($tokens)
            ->map(fn (string $token) => $this->normalizeSizeBand($token))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function isAdjacentSize(string $size, array $targets): bool
    {
        $order = [
            'micro' => 0,
            'small' => 1,
            'medium' => 2,
            'large' => 3,
            'enterprise' => 4,
        ];

        if (! isset($order[$size])) {
            return false;
        }

        foreach ($targets as $target) {
            if (isset($order[$target]) && abs($order[$target] - $order[$size]) === 1) {
                return true;
            }
        }

        return false;
    }
}
