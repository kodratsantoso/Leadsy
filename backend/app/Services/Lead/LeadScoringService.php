<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadIcpConfig;
use App\Models\LeadScore;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Deterministic Lead Scoring Service
 *
 * This service is intentionally rule-based and explainable.
 * It does not call AI and always produces the same output for the same input.
 */
class LeadScoringService
{
    private const FACTOR_WEIGHTS = [
        'industry_match' => 25.00,
        'company_size' => 15.00,
        'location_relevance' => 15.00,
        'data_completeness' => 10.00,
        'contact_availability' => 15.00,
        'source_reliability' => 10.00,
        'activity_signal' => 10.00,
    ];

    /**
     * Persist a deterministic score snapshot for a lead.
     * The second parameter remains for backward compatibility but is ignored.
     */
    public function scoreLead(Lead $lead, bool $useAi = false): LeadScore
    {
        $analysis = $this->calculateLeadScore($lead);
        $now = Carbon::now();

        return DB::transaction(function () use ($lead, $analysis, $now) {
            $lead->scoreBreakdowns()->delete();

            foreach ($analysis['breakdown'] as $row) {
                $lead->scoreBreakdowns()->create([
                    'tenant_id' => $lead->tenant_id,
                    'factor' => $row['factor_key'],
                    'value' => $row['value'],
                    'weight' => $row['weight'],
                    'score_contribution' => $row['score_contribution'],
                ]);
            }

            /** @var LeadScore $scoreRecord */
            $scoreRecord = $lead->scores()->create([
                'tenant_id' => $lead->tenant_id,
                'score' => $analysis['score'],
                'grade' => $analysis['grade'],
                'score_breakdown' => $analysis['breakdown'],
                'calculated_at' => $now,
                'last_scored_at' => $now,
            ]);

            $lead->analysisLogs()->create([
                'tenant_id' => $lead->tenant_id,
                'analysis_type' => 'deterministic_lead_score',
                'result_json' => [
                    'score' => $analysis['score'],
                    'grade' => $analysis['grade'],
                    'explanation' => $analysis['explanation'],
                    'breakdown' => $analysis['breakdown'],
                    'weights' => self::FACTOR_WEIGHTS,
                ],
                'created_at' => $now,
            ]);

            $lead->update([
                'lead_score' => $analysis['score'],
                'ai_explanation' => $analysis['explanation'],
            ]);

            return $scoreRecord->fresh();
        });
    }

    public function rescoreLead(Lead $lead, bool $useAi = false): LeadScore
    {
        return $this->scoreLead($lead, false);
    }

    public function applyManualOverride(Lead $lead, int $score, string $reason, ?User $reviewer = null): LeadScore
    {
        $score = max(0, min(100, $score));
        $now = Carbon::now();
        $grade = self::gradeForScore($score);
        $explanation = 'Human reviewer override applied. ' . trim($reason);

        return DB::transaction(function () use ($lead, $score, $grade, $explanation, $reason, $reviewer, $now) {
            /** @var LeadScore $scoreRecord */
            $scoreRecord = $lead->scores()->create([
                'tenant_id' => $lead->tenant_id,
                'score' => $score,
                'grade' => $grade,
                'score_breakdown' => [[
                    'factor_key' => 'manual_override',
                    'factor' => 'Manual Override',
                    'value' => (string) $score,
                    'weight' => 100,
                    'raw_score' => $score,
                    'score_contribution' => $score,
                    'reason' => $reason,
                ]],
                'calculated_at' => $now,
                'last_scored_at' => $now,
            ]);

            $lead->analysisLogs()->create([
                'tenant_id' => $lead->tenant_id,
                'analysis_type' => 'manual_score_override',
                'result_json' => [
                    'score' => $score,
                    'grade' => $grade,
                    'reason' => $reason,
                    'reviewer_id' => $reviewer?->id,
                    'reviewer_name' => $reviewer?->name,
                ],
                'created_at' => $now,
            ]);

            $lead->update([
                'lead_score' => $score,
                'ai_explanation' => $explanation,
            ]);

            return $scoreRecord->fresh();
        });
    }

    public static function gradeForScore(int $score): string
    {
        return match (true) {
            $score >= 80 => 'Hot',
            $score >= 60 => 'Warm',
            default => 'Cold',
        };
    }

    /**
     * Returns a deterministic scoring payload without persisting it.
     *
     * @return array{
     *   score:int,
     *   grade:string,
     *   explanation:string,
     *   breakdown:array<int,array<string,mixed>>
     * }
     */
    public function calculateLeadScore(Lead $lead): array
    {
        $lead->loadMissing([
            'industry',
            'territory',
            'contacts',
            'sources',
            'activities',
        ]);

        $icpConfig = $this->getScopedIcpConfig($lead);
        $factorResults = [
            $this->evaluateIndustryMatch($lead, $icpConfig),
            $this->evaluateCompanySize($lead, $icpConfig),
            $this->evaluateLocationRelevance($lead, $icpConfig),
            $this->evaluateDataCompleteness($lead),
            $this->evaluateContactAvailability($lead),
            $this->evaluateSourceReliability($lead),
            $this->evaluateActivitySignal($lead),
        ];

        $score = (int) round(collect($factorResults)->sum('score_contribution'));
        $score = max(0, min(100, $score));

        return [
            'score' => $score,
            'grade' => $this->gradeFromScore($score),
            'explanation' => $this->buildExplanation($factorResults),
            'breakdown' => $factorResults,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int,LeadIcpConfig>
     */
    private function getScopedIcpConfig(Lead $lead)
    {
        return LeadIcpConfig::query()
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
    }

    private function evaluateIndustryMatch(Lead $lead, $icpConfig): array
    {
        $weight = self::FACTOR_WEIGHTS['industry_match'];
        $industryName = trim((string) ($lead->industry?->name ?? $lead->business_category ?? ''));
        $industryKey = Str::lower($industryName);

        if ($industryKey === '') {
            return $this->factorResult(
                'industry_match',
                'Industry Match',
                $weight,
                0,
                'unknown',
                'Industry is missing, so target-market fit cannot be verified.'
            );
        }

        if ($icpConfig->isEmpty()) {
            return $this->factorResult(
                'industry_match',
                'Industry Match',
                $weight,
                60,
                $industryName,
                'Industry is known, but no ICP industry configuration exists yet.'
            );
        }

        foreach ($icpConfig as $config) {
            $targetIndustry = Str::lower(trim($config->industry));
            if ($targetIndustry === $industryKey) {
                return $this->factorResult(
                    'industry_match',
                    'Industry Match',
                    $weight,
                    100,
                    $industryName,
                    "Exact ICP industry match: {$config->industry}."
                );
            }

            if (Str::contains($industryKey, $targetIndustry) || Str::contains($targetIndustry, $industryKey)) {
                return $this->factorResult(
                    'industry_match',
                    'Industry Match',
                    $weight,
                    75,
                    $industryName,
                    "Partial ICP industry match: {$config->industry}."
                );
            }
        }

        return $this->factorResult(
            'industry_match',
            'Industry Match',
            $weight,
            20,
            $industryName,
            'Industry is known but does not match the current ICP configuration.'
        );
    }

    private function evaluateCompanySize(Lead $lead, $icpConfig): array
    {
        $weight = self::FACTOR_WEIGHTS['company_size'];
        $size = $this->normalizeSizeBand((string) ($lead->company_size_estimate ?? ''));

        if ($size === null) {
            return $this->factorResult(
                'company_size',
                'Company Size',
                $weight,
                40,
                'unknown',
                'Company size is not known.'
            );
        }

        $sizeConfigs = $icpConfig->filter(fn (LeadIcpConfig $config) => ! empty($config->size_range));

        if ($sizeConfigs->isEmpty()) {
            return $this->factorResult(
                'company_size',
                'Company Size',
                $weight,
                60,
                $size,
                'Company size is known, but no ICP size range is configured.'
            );
        }

        foreach ($sizeConfigs as $config) {
            $targets = $this->parseSizeRange($config->size_range ?? '');

            if (in_array($size, $targets, true)) {
                return $this->factorResult(
                    'company_size',
                    'Company Size',
                    $weight,
                    100,
                    $size,
                    "Company size falls inside target range {$config->size_range}."
                );
            }

            if ($this->isAdjacentSize($size, $targets)) {
                return $this->factorResult(
                    'company_size',
                    'Company Size',
                    $weight,
                    70,
                    $size,
                    "Company size is adjacent to target range {$config->size_range}."
                );
            }
        }

        return $this->factorResult(
            'company_size',
            'Company Size',
            $weight,
            20,
            $size,
            'Company size is outside the configured target range.'
        );
    }

    private function evaluateLocationRelevance(Lead $lead, $icpConfig): array
    {
        $weight = self::FACTOR_WEIGHTS['location_relevance'];
        $locationText = trim(implode(' | ', array_filter([
            $lead->territory?->name,
            $lead->address,
        ])));

        if ($locationText === '') {
            return $this->factorResult(
                'location_relevance',
                'Location Relevance',
                $weight,
                0,
                'unknown',
                'No territory or address is available.'
            );
        }

        $locationConfigs = $icpConfig->filter(fn (LeadIcpConfig $config) => ! empty($config->location));

        if ($locationConfigs->isEmpty()) {
            return $this->factorResult(
                'location_relevance',
                'Location Relevance',
                $weight,
                60,
                $locationText,
                'Location is known, but no ICP location has been configured.'
            );
        }

        $locationHaystack = Str::lower($locationText);
        foreach ($locationConfigs as $config) {
            $targetLocation = Str::lower(trim((string) $config->location));
            if ($targetLocation !== '' && Str::contains($locationHaystack, $targetLocation)) {
                return $this->factorResult(
                    'location_relevance',
                    'Location Relevance',
                    $weight,
                    100,
                    $locationText,
                    "Lead is inside configured target location {$config->location}."
                );
            }
        }

        return $this->factorResult(
            'location_relevance',
            'Location Relevance',
            $weight,
            25,
            $locationText,
            'Location is known but outside the configured target location.'
        );
    }

    private function evaluateDataCompleteness(Lead $lead): array
    {
        $weight = self::FACTOR_WEIGHTS['data_completeness'];

        $required = [
            'company_name' => ! empty($lead->company_name),
            'address' => ! empty($lead->address),
            'website' => ! empty($lead->website),
            'industry' => ! empty($lead->industry?->name) || ! empty($lead->business_category),
            'company_size' => ! empty($lead->company_size_estimate),
            'phone' => ! empty($lead->phone),
            'email' => ! empty($lead->email),
            'source' => $lead->sources->isNotEmpty(),
        ];

        $completed = collect($required)->filter()->count();
        $rawScore = (int) round(($completed / count($required)) * 100);

        return $this->factorResult(
            'data_completeness',
            'Data Completeness',
            $weight,
            $rawScore,
            "{$completed}/" . count($required),
            "Completed {$completed} of " . count($required) . ' core lead fields.'
        );
    }

    private function evaluateContactAvailability(Lead $lead): array
    {
        $weight = self::FACTOR_WEIGHTS['contact_availability'];

        $primaryContact = $lead->contacts->firstWhere('is_primary', true);
        $leadHasPhone = ! empty($lead->phone);
        $leadHasEmail = ! empty($lead->email);

        if ($primaryContact && ! empty($primaryContact->phone) && ! empty($primaryContact->email)) {
            return $this->factorResult(
                'contact_availability',
                'Contact Availability',
                $weight,
                100,
                'primary contact + phone + email',
                'Primary contact has both phone and email.'
            );
        }

        if ($leadHasPhone && $leadHasEmail) {
            return $this->factorResult(
                'contact_availability',
                'Contact Availability',
                $weight,
                80,
                'company phone + email',
                'Company-level phone and email are available.'
            );
        }

        if ($lead->contacts->isNotEmpty() || $leadHasPhone || $leadHasEmail) {
            return $this->factorResult(
                'contact_availability',
                'Contact Availability',
                $weight,
                60,
                'partial direct contact',
                'At least one direct contact path is available.'
            );
        }

        if (! empty($lead->website)) {
            return $this->factorResult(
                'contact_availability',
                'Contact Availability',
                $weight,
                30,
                'website only',
                'Only indirect contact via website is available.'
            );
        }

        return $this->factorResult(
            'contact_availability',
            'Contact Availability',
            $weight,
            0,
            'none',
            'No usable contact path is available.'
        );
    }

    private function evaluateSourceReliability(Lead $lead): array
    {
        $weight = self::FACTOR_WEIGHTS['source_reliability'];

        if ($lead->sources->isEmpty()) {
            return $this->factorResult(
                'source_reliability',
                'Source Reliability',
                $weight,
                ! empty($lead->website) ? 50 : 20,
                ! empty($lead->website) ? 'website-only' : 'unknown',
                ! empty($lead->website)
                    ? 'Website exists but no explicit source record is stored.'
                    : 'Lead source is unknown.'
            );
        }

        $bestSource = $lead->sources
            ->map(function ($source) {
                $typeScore = match ($source->source_type) {
                    'google_maps' => 85,
                    'website', 'official_website' => 90,
                    'partner', 'trusted_partner' => 95,
                    'manual' => 70,
                    'csv_import', 'directory', 'public_directory' => 60,
                    default => 45,
                };

                $confidenceScore = match ($source->confidence) {
                    'high' => 95,
                    'medium' => 70,
                    'low' => 45,
                    default => 50,
                };

                return [
                    'label' => $source->source_type . ' / ' . $source->confidence,
                    'score' => (int) round(($typeScore + $confidenceScore) / 2),
                ];
            })
            ->sortByDesc('score')
            ->first();

        return $this->factorResult(
            'source_reliability',
            'Source Reliability',
            $weight,
            $bestSource['score'],
            $bestSource['label'],
            "Best available source reliability is {$bestSource['score']}/100."
        );
    }

    private function evaluateActivitySignal(Lead $lead): array
    {
        $weight = self::FACTOR_WEIGHTS['activity_signal'];
        $latestActivity = $lead->activities->sortByDesc('activity_date')->first();

        if (! $latestActivity) {
            return $this->factorResult(
                'activity_signal',
                'Activity Signal',
                $weight,
                0,
                'no activity',
                'No activity has been recorded for this lead.'
            );
        }

        $days = Carbon::now()->diffInDays(Carbon::parse($latestActivity->activity_date));

        $rawScore = match (true) {
            $days <= 7 => 100,
            $days <= 30 => 70,
            $days <= 90 => 40,
            default => 20,
        };

        return $this->factorResult(
            'activity_signal',
            'Activity Signal',
            $weight,
            $rawScore,
            "{$days} days since last activity",
            "Latest recorded activity is {$days} days old."
        );
    }

    private function factorResult(
        string $key,
        string $label,
        float $weight,
        int $rawScore,
        string $value,
        string $reason
    ): array {
        $scoreContribution = round(($rawScore / 100) * $weight, 2);

        return [
            'factor_key' => $key,
            'factor' => $label,
            'value' => $value,
            'weight' => $weight,
            'raw_score' => $rawScore,
            'score_contribution' => $scoreContribution,
            'reason' => $reason,
        ];
    }

    private function gradeFromScore(int $score): string
    {
        return self::gradeForScore($score);
    }

    /**
     * @param array<int,array<string,mixed>> $factorResults
     */
    private function buildExplanation(array $factorResults): string
    {
        $strengths = collect($factorResults)
            ->where('raw_score', '>=', 70)
            ->pluck('factor')
            ->take(2)
            ->values()
            ->all();

        $gaps = collect($factorResults)
            ->where('raw_score', '<', 50)
            ->pluck('factor')
            ->take(2)
            ->values()
            ->all();

        $parts = [];

        if ($strengths !== []) {
            $parts[] = 'Strong on ' . $this->joinLabelList($strengths) . '.';
        }

        if ($gaps !== []) {
            $parts[] = 'Needs improvement in ' . $this->joinLabelList($gaps) . '.';
        }

        if ($parts === []) {
            return 'Lead score is balanced across factors with no standout strength or weakness.';
        }

        return implode(' ', $parts);
    }

    /**
     * @param array<int,string> $labels
     */
    private function joinLabelList(array $labels): string
    {
        return match (count($labels)) {
            0 => 'none',
            1 => $labels[0],
            2 => $labels[0] . ' and ' . $labels[1],
            default => implode(', ', array_slice($labels, 0, -1)) . ', and ' . end($labels),
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

    /**
     * @return array<int,string>
     */
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

    /**
     * @param array<int,string> $targets
     */
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
