<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\LeadPrescription;
use App\Models\User;

class PrescriptiveEngineService
{
    public function prescribe(Lead $lead): array
    {
        $lead->loadMissing('contacts', 'activities', 'owner', 'industry', 'product', 'funnelStage');

        $score = (float) ($lead->lead_score ?? 0);
        $qualified = $lead->qualification_status ?? 'new';

        $lastActivity = $lead->activities()->latest('activity_date')->first();
        $daysSinceActive = $lastActivity
            ? (int) now()->diffInDays($lastActivity->activity_date)
            : 9999;

        $hasActivities = $lead->activities->count() > 0;

        $approach = $this->approach($score, $qualified);
        $nextAction = $this->nextAction($hasActivities, $daysSinceActive, $qualified, $score);
        $followUpTiming = $this->followUpTiming($score, $qualified, $daysSinceActive);
        $owner = $this->recommendOwner($lead);
        $priority = (int) min(10, max(1, round($score / 10)));
        $reasoning = $this->buildReasoning($lead, $score, $qualified, $daysSinceActive);

        $prescription = LeadPrescription::create([
            'lead_id' => $lead->id,
            'recommended_owner_id' => $owner?->id,
            'recommended_approach' => $approach,
            'next_best_action' => $nextAction,
            'follow_up_timing' => $followUpTiming,
            'priority_score' => $priority,
            'reasoning' => $reasoning,
        ]);

        return array_merge($prescription->toArray(), [
            'recommended_owner' => $owner
                ? ['id' => $owner->id, 'name' => $owner->name]
                : null,
        ]);
    }

    private function approach(float $score, string $qualified): string
    {
        if ($score >= 70 && $qualified === 'yes') {
            return 'Direct sales engagement — lead is ready for proposal stage';
        }
        if ($score >= 50) {
            return 'Active nurturing — schedule discovery call to further qualify';
        }
        if ($score >= 30) {
            return 'Content-based nurturing — educate before direct outreach';
        }

        return 'Passive monitoring — enrich data before investing sales effort';
    }

    private function nextAction(bool $hasActivity, int $daysSince, string $qualified, float $score): string
    {
        if (! $hasActivity) {
            return 'Make first contact — introduce product and qualify interest';
        }
        if ($daysSince > 30) {
            return 'Re-engage — personalised follow-up after extended silence';
        }
        if ($qualified === 'yes' && $score >= 60) {
            return 'Schedule product demo or proposal presentation';
        }
        if ($daysSince > 7) {
            return 'Follow-up call — maintain momentum and gather qualification data';
        }

        return 'Continue current engagement — track progress toward next funnel stage';
    }

    private function followUpTiming(float $score, string $qualified, int $daysSince): string
    {
        if ($qualified === 'yes' && $score >= 70) {
            return 'within 24 hours';
        }
        if ($score >= 50) {
            return 'within 3 days';
        }
        if ($daysSince > 30) {
            return 'within 1 week';
        }

        return 'within 2 weeks';
    }

    private function recommendOwner(Lead $lead): ?User
    {
        if ($lead->owner) {
            return $lead->owner;
        }

        return User::whereHas('role', fn ($q) => $q->whereIn('name', ['sales_exec', 'sales_manager']))
            ->first();
    }

    private function buildReasoning(Lead $lead, float $score, string $qualified, int $daysSince): string
    {
        $parts = ["Lead score: {$score}/100", "Qualification: {$qualified}"];
        if ($daysSince < 9999) {
            $parts[] = "Last activity: {$daysSince} days ago";
        } else {
            $parts[] = 'No activity recorded';
        }
        if ($lead->industry) {
            $parts[] = "Industry: {$lead->industry->name}";
        }
        if ($lead->funnelStage) {
            $parts[] = "Funnel: {$lead->funnelStage->name}";
        }

        return implode('. ', $parts).'.';
    }
}
