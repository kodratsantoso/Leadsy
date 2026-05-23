<?php

namespace App\Services\Lead;

use App\Models\Lead;

class QualificationRuleEngineService
{
    public function __construct(private QualificationPolicyRepository $policyRepository) {}

    public function evaluate(array $input): array
    {
        $policy = $this->policyRepository->getPolicy();
        $snapshot = $this->normalizeSnapshot($input);

        $dimensionBreakdown = [
            'firmographic' => $this->scoreFirmographic($snapshot, $policy['dimensions']['firmographic']),
            'need_relevance' => $this->scoreNeedRelevance($snapshot, $policy['dimensions']['need_relevance']),
            'commercial_readiness' => $this->scoreCommercialReadiness($snapshot, $policy['dimensions']['commercial_readiness']),
            'stakeholder_access' => $this->scoreStakeholderAccess($snapshot, $policy['dimensions']['stakeholder_access']),
            'technical_fit' => $this->scoreTechnicalFit($snapshot, $policy['dimensions']['technical_fit']),
        ];

        $score = array_sum(array_column($dimensionBreakdown, 'points'));
        $hardStops = $this->detectHardStops($snapshot, $policy['hard_stops']);
        $criticalDataGaps = $this->findCriticalDataGaps($snapshot, $policy['critical_fields']);
        $status = $this->classify($score, $hardStops, $criticalDataGaps, $policy['thresholds']);

        $riskFlags = collect($dimensionBreakdown)
            ->flatMap(fn (array $dimension) => $dimension['risk_flags'])
            ->merge($hardStops)
            ->merge(array_map(fn (string $field) => "Missing critical field: {$field}", $criticalDataGaps))
            ->unique()
            ->values()
            ->all();

        $reasoning = collect($dimensionBreakdown)
            ->map(fn (array $dimension, string $name) => sprintf(
                '%s: %s (%d/%d)',
                str_replace('_', ' ', ucfirst($name)),
                $dimension['summary'],
                $dimension['points'],
                $dimension['max_points']
            ))
            ->values()
            ->all();

        return [
            'policy_version' => $policy['version'],
            'policy_source' => $policy['source'] ?? 'config',
            'parameter_set' => $policy['parameter_set'] ?? null,
            'status' => $status,
            'score' => $score,
            'reasoning' => $reasoning,
            'risk_flags' => $riskFlags,
            'recommendation' => $policy['recommendations'][$status] ?? null,
            'hard_stops' => $hardStops,
            'critical_data_gaps' => $criticalDataGaps,
            'dimension_breakdown' => $dimensionBreakdown,
            'input_snapshot' => $snapshot,
        ];
    }

    public function evaluateLead(Lead $lead): array
    {
        return $this->evaluate($this->buildLeadSnapshot($lead));
    }

    public function buildLeadSnapshot(Lead $lead): array
    {
        $lead->loadMissing(['industry', 'contacts', 'activities', 'product', 'territory']);

        $primaryContact = $lead->contacts->firstWhere('is_primary', true) ?? $lead->contacts->first();
        $hasRecentActivity = optional($lead->activities->sortByDesc('activity_date')->first())->activity_date !== null;
        $productMatch = $lead->productMatches()->where('is_recommended', true)->orderByDesc('match_score')->first();

        return [
            'source' => 'lead_record',
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name ?? $lead->business_category,
            'company_size_band' => $this->normalizeCompanySizeBand($lead->company_size_estimate, $lead->branch_count),
            'territory_fit' => $lead->territory_id ? true : null,
            'target_industry_fit' => $productMatch?->match_score >= 75 ? 'high' : ($lead->industry_id ? 'medium' : 'unknown'),
            'problem_statement' => $lead->ai_explanation,
            'pain_level' => $hasRecentActivity ? 'medium' : 'unknown',
            'use_case_fit' => $lead->product_id ? 'medium' : 'unknown',
            'budget_status' => 'unknown',
            'timeline_months' => null,
            'commercial_urgency' => $hasRecentActivity ? 'medium' : 'unknown',
            'decision_maker_engaged' => $primaryContact ? $this->looksLikeDecisionMaker($primaryContact->title) : null,
            'stakeholder_count' => $lead->contacts->count(),
            'contact_quality' => $primaryContact?->email || $primaryContact?->phone ? 'strong' : ($primaryContact ? 'weak' : 'absent'),
            'technical_fit' => $lead->website ? 'medium' : 'unknown',
            'integration_complexity' => 'unknown',
            'required_capabilities' => [],
            'notes' => null,
        ];
    }

    private function normalizeSnapshot(array $input): array
    {
        return [
            'source' => $input['source'] ?? 'manual',
            'lead_id' => $input['lead_id'] ?? null,
            'company_name' => trim((string) ($input['company_name'] ?? '')),
            'industry' => $this->normalizeNullableString($input['industry'] ?? null),
            'company_size_band' => $this->normalizeEnum($input['company_size_band'] ?? 'unknown', ['micro', 'small', 'medium', 'enterprise', 'unknown']),
            'territory_fit' => $this->normalizeNullableBool($input['territory_fit'] ?? null),
            'target_industry_fit' => $this->normalizeEnum($input['target_industry_fit'] ?? 'unknown', ['high', 'medium', 'low', 'unknown']),
            'problem_statement' => $this->normalizeNullableString($input['problem_statement'] ?? null),
            'pain_level' => $this->normalizeEnum($input['pain_level'] ?? 'unknown', ['high', 'medium', 'low', 'unknown']),
            'use_case_fit' => $this->normalizeEnum($input['use_case_fit'] ?? 'unknown', ['high', 'medium', 'low', 'unknown']),
            'budget_status' => $this->normalizeEnum($input['budget_status'] ?? 'unknown', ['confirmed', 'range', 'unknown', 'unavailable']),
            'timeline_months' => isset($input['timeline_months']) && $input['timeline_months'] !== '' ? (int) $input['timeline_months'] : null,
            'commercial_urgency' => $this->normalizeEnum($input['commercial_urgency'] ?? 'unknown', ['high', 'medium', 'low', 'unknown']),
            'decision_maker_engaged' => $this->normalizeNullableBool($input['decision_maker_engaged'] ?? null),
            'stakeholder_count' => max(0, (int) ($input['stakeholder_count'] ?? 0)),
            'contact_quality' => $this->normalizeEnum($input['contact_quality'] ?? 'absent', ['strong', 'weak', 'absent']),
            'technical_fit' => $this->normalizeEnum($input['technical_fit'] ?? 'unknown', ['high', 'medium', 'low', 'unknown']),
            'integration_complexity' => $this->normalizeEnum($input['integration_complexity'] ?? 'unknown', ['low', 'medium', 'high', 'unknown']),
            'required_capabilities' => array_values(array_filter(array_map(
                fn ($value) => trim((string) $value),
                is_array($input['required_capabilities'] ?? null)
                    ? ($input['required_capabilities'] ?? [])
                    : preg_split('/\r\n|\r|\n/', (string) ($input['required_capabilities'] ?? ''), -1, PREG_SPLIT_NO_EMPTY)
            ))),
            'notes' => $this->normalizeNullableString($input['notes'] ?? null),
        ];
    }

    private function scoreFirmographic(array $snapshot, array $policy): array
    {
        $points = ($policy['industry_fit'][$snapshot['target_industry_fit']] ?? 0)
            + ($policy['company_size_band'][$snapshot['company_size_band']] ?? 0)
            + ($policy['territory_fit'][$this->boolKey($snapshot['territory_fit'])] ?? 0);

        $signals = [];
        if ($snapshot['target_industry_fit'] !== 'unknown') {
            $signals[] = 'Industry fit assessed';
        }
        if ($snapshot['company_size_band'] !== 'unknown') {
            $signals[] = 'Company size band identified';
        }
        if ($snapshot['territory_fit'] === true) {
            $signals[] = 'Inside supported territory';
        }

        $risks = [];
        if ($snapshot['target_industry_fit'] === 'low') {
            $risks[] = 'Industry alignment is weak.';
        }
        if ($snapshot['territory_fit'] === false) {
            $risks[] = 'Territory coverage is not approved.';
        }

        return $this->dimensionResult($points, $policy['weight'], $signals, $risks, 'Firmographic fit based on industry, size, and territory.');
    }

    private function scoreNeedRelevance(array $snapshot, array $policy): array
    {
        $problemKey = $snapshot['problem_statement'] ? 'present' : 'absent';
        $points = ($policy['problem_statement'][$problemKey] ?? 0)
            + ($policy['pain_level'][$snapshot['pain_level']] ?? 0)
            + ($policy['use_case_fit'][$snapshot['use_case_fit']] ?? 0);

        $signals = [];
        if ($snapshot['problem_statement']) {
            $signals[] = 'Business problem articulated';
        }
        if (in_array($snapshot['pain_level'], ['high', 'medium'], true)) {
            $signals[] = 'Pain level is material';
        }
        if (in_array($snapshot['use_case_fit'], ['high', 'medium'], true)) {
            $signals[] = 'Use case aligns with offering';
        }

        $risks = [];
        if (! $snapshot['problem_statement']) {
            $risks[] = 'Problem statement is missing.';
        }
        if ($snapshot['use_case_fit'] === 'low') {
            $risks[] = 'Use-case fit is weak.';
        }

        return $this->dimensionResult($points, $policy['weight'], $signals, $risks, 'Need relevance reflects problem clarity, pain, and use-case fit.');
    }

    private function scoreCommercialReadiness(array $snapshot, array $policy): array
    {
        $timelineKey = match (true) {
            $snapshot['timeline_months'] === null => 'unknown',
            $snapshot['timeline_months'] <= 3 => 'fast',
            $snapshot['timeline_months'] <= 6 => 'planned',
            $snapshot['timeline_months'] <= 12 => 'long',
            default => 'deferred',
        };

        $points = ($policy['budget_status'][$snapshot['budget_status']] ?? 0)
            + ($policy['timeline_months'][$timelineKey] ?? 0)
            + ($policy['commercial_urgency'][$snapshot['commercial_urgency']] ?? 0);

        $signals = [];
        if (in_array($snapshot['budget_status'], ['confirmed', 'range'], true)) {
            $signals[] = 'Commercial path identified';
        }
        if ($timelineKey === 'fast') {
            $signals[] = 'Buying timeline is near-term';
        }
        if ($snapshot['commercial_urgency'] === 'high') {
            $signals[] = 'Commercial urgency is high';
        }

        $risks = [];
        if ($snapshot['budget_status'] === 'unknown') {
            $risks[] = 'Budget is not yet validated.';
        }
        if ($timelineKey === 'deferred') {
            $risks[] = 'Timeline is too distant for immediate pipeline progression.';
        }

        return $this->dimensionResult($points, $policy['weight'], $signals, $risks, 'Commercial readiness reflects budget, timing, and urgency.');
    }

    private function scoreStakeholderAccess(array $snapshot, array $policy): array
    {
        $decisionKey = $this->boolKey($snapshot['decision_maker_engaged']);
        $stakeholderKey = match (true) {
            $snapshot['stakeholder_count'] >= 2 => 'multi',
            $snapshot['stakeholder_count'] === 1 => 'single',
            default => 'none',
        };

        $points = ($policy['decision_maker_engaged'][$decisionKey] ?? 0)
            + ($policy['stakeholder_count'][$stakeholderKey] ?? 0)
            + ($policy['contact_quality'][$snapshot['contact_quality']] ?? 0);

        $signals = [];
        if ($snapshot['decision_maker_engaged'] === true) {
            $signals[] = 'Decision-maker access confirmed';
        }
        if ($snapshot['stakeholder_count'] >= 2) {
            $signals[] = 'Multiple stakeholders identified';
        }
        if ($snapshot['contact_quality'] === 'strong') {
            $signals[] = 'Named contact is usable for follow-up';
        }

        $risks = [];
        if ($snapshot['decision_maker_engaged'] !== true) {
            $risks[] = 'Decision-maker access is not confirmed.';
        }
        if ($snapshot['stakeholder_count'] === 0) {
            $risks[] = 'No stakeholder coverage captured.';
        }

        return $this->dimensionResult($points, $policy['weight'], $signals, $risks, 'Stakeholder access reflects buyer access and contact quality.');
    }

    private function scoreTechnicalFit(array $snapshot, array $policy): array
    {
        $points = ($policy['technical_fit'][$snapshot['technical_fit']] ?? 0)
            + ($policy['integration_complexity'][$snapshot['integration_complexity']] ?? 0)
            + ($policy['capabilities_defined'][count($snapshot['required_capabilities']) > 0 ? 'yes' : 'no'] ?? 0);

        $signals = [];
        if (in_array($snapshot['technical_fit'], ['high', 'medium'], true)) {
            $signals[] = 'Technical fit is acceptable';
        }
        if ($snapshot['integration_complexity'] === 'low') {
            $signals[] = 'Integration complexity appears manageable';
        }
        if (count($snapshot['required_capabilities']) > 0) {
            $signals[] = 'Required capabilities have been defined';
        }

        $risks = [];
        if ($snapshot['technical_fit'] === 'unknown') {
            $risks[] = 'Technical fit has not been validated.';
        }
        if ($snapshot['integration_complexity'] === 'high') {
            $risks[] = 'Integration complexity is high.';
        }

        return $this->dimensionResult($points, $policy['weight'], $signals, $risks, 'Technical fit reflects compatibility and delivery feasibility.');
    }

    private function detectHardStops(array $snapshot, array $rules): array
    {
        $messages = [];

        foreach ($rules as $rule) {
            $fieldValue = $snapshot[$rule['field']] ?? null;
            if (($rule['operator'] ?? null) === 'equals' && $fieldValue === $rule['value']) {
                $messages[] = $rule['message'];
            }
        }

        return array_values(array_unique($messages));
    }

    private function findCriticalDataGaps(array $snapshot, array $criticalFields): array
    {
        $missing = [];

        foreach ($criticalFields as $field) {
            $value = $snapshot[$field] ?? null;
            if ($value === null || $value === '' || $value === 'unknown') {
                $missing[] = $field;
            }
        }

        return $missing;
    }

    private function classify(int $score, array $hardStops, array $criticalDataGaps, array $thresholds): string
    {
        if ($hardStops !== []) {
            return 'not_eligible';
        }

        if (count($criticalDataGaps) >= ($thresholds['missing_critical_fields_for_review'] ?? 3)) {
            return 'need_review';
        }

        if ($score >= ($thresholds['eligible'] ?? 80)) {
            return 'eligible';
        }

        if ($score >= ($thresholds['potential'] ?? 60)) {
            return 'potential';
        }

        if ($score >= ($thresholds['need_review_floor'] ?? 40)) {
            return 'need_review';
        }

        return 'not_eligible';
    }

    private function dimensionResult(int $points, int $maxPoints, array $signals, array $riskFlags, string $fallbackSummary): array
    {
        $summary = $signals !== []
            ? implode('; ', $signals)
            : $fallbackSummary;

        return [
            'points' => min($points, $maxPoints),
            'max_points' => $maxPoints,
            'signals' => array_values($signals),
            'risk_flags' => array_values(array_unique($riskFlags)),
            'summary' => $summary,
        ];
    }

    private function normalizeCompanySizeBand(?string $companySizeEstimate, ?int $branchCount): string
    {
        $size = strtolower((string) $companySizeEstimate);

        if ($size !== '') {
            if (str_contains($size, 'enterprise') || str_contains($size, '1000') || str_contains($size, '5000')) {
                return 'enterprise';
            }
            if (str_contains($size, 'medium') || str_contains($size, 'large') || str_contains($size, '500')) {
                return 'medium';
            }
            if (str_contains($size, 'small') || str_contains($size, '50') || str_contains($size, '250')) {
                return 'small';
            }
            if (str_contains($size, 'micro') || str_contains($size, '1-10') || str_contains($size, '10')) {
                return 'micro';
            }
        }

        return match (true) {
            $branchCount >= 50 => 'enterprise',
            $branchCount >= 20 => 'medium',
            $branchCount >= 5 => 'small',
            $branchCount >= 1 => 'micro',
            default => 'unknown',
        };
    }

    private function looksLikeDecisionMaker(?string $title): ?bool
    {
        if (! $title) {
            return null;
        }

        return (bool) preg_match('/\b(owner|founder|ceo|cto|coo|director|head|vp|president)\b/i', $title);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeEnum(mixed $value, array $allowed): string
    {
        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, $allowed, true) ? $normalized : 'unknown';
    }

    private function normalizeNullableBool(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        return match (strtolower((string) $value)) {
            '1', 'true', 'yes' => true,
            '0', 'false', 'no' => false,
            default => null,
        };
    }

    private function boolKey(?bool $value): string
    {
        return match ($value) {
            true => 'yes',
            false => 'no',
            default => 'unknown',
        };
    }
}
