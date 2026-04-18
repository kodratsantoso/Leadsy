<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\RevenueRule;

class RevenueRuleEngineService
{
    public function evaluate(Lead $lead): array
    {
        $lead->loadMissing('contacts', 'activities');

        $rules   = RevenueRule::where('is_active', true)->orderBy('priority')->get();
        $results = [];
        $blocked = false;
        $flags   = [];

        foreach ($rules as $rule) {
            if ($this->evaluateRule($rule, $lead)) {
                $results[] = [
                    'rule'     => $rule->name,
                    'action'   => $rule->action,
                    'severity' => $rule->severity,
                ];
                if ($rule->action === 'block') $blocked = true;
                if ($rule->action === 'flag')  $flags[] = $rule->name;
            }
        }

        return [
            'blocked'           => $blocked,
            'flags'             => $flags,
            'rules_triggered'   => $results,
            'can_enter_pipeline'=> !$blocked,
            'summary'           => $this->summary($blocked, $flags),
        ];
    }

    private function evaluateRule(RevenueRule $rule, Lead $lead): bool
    {
        $v = $rule->condition_value;
        return match ($rule->condition_type) {
            'score_below'          => ($lead->lead_score ?? 0) < ($v['threshold'] ?? 0),
            'score_above'          => ($lead->lead_score ?? 0) > ($v['threshold'] ?? 100),
            'missing_field'        => empty($lead->{$v['field'] ?? ''}),
            'industry_not_in'      => !in_array($lead->industry_id, $v['industry_ids'] ?? []),
            'qualification_status' => $lead->qualification_status === ($v['status'] ?? ''),
            'ghost_lead'           => $this->isGhost($lead),
            default                => false,
        };
    }

    private function isGhost(Lead $lead): bool
    {
        return ($lead->lead_score ?? 0) < 20
            && $lead->created_at < now()->subDays(14)
            && $lead->contacts->isEmpty()
            && $lead->activities->isEmpty();
    }

    private function summary(bool $blocked, array $flags): string
    {
        if ($blocked) return 'Lead is blocked from pipeline entry';
        if (!empty($flags)) return 'Lead flagged: ' . implode(', ', $flags);
        return 'Lead cleared for pipeline entry';
    }
}
