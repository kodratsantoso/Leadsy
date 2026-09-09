<?php

namespace App\Services\CustomerSuccess;

use App\Models\AiAttentionHighlight;
use App\Models\CustomerHealthScore;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class ChurnRiskDetectionService
{
    public function __construct(
        private CustomerHealthScoreService $healthScoreService,
    ) {}

    /**
     * Scan all active/won customers and flag accounts at high risk of churn.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function detectChurnRisks(): Collection
    {
        // Fetch won leads or clients with active sales orders
        $clients = Lead::with(['funnelStage', 'activities' => fn ($q) => $q->latest('activity_date'), 'onboardingMilestones', 'csmOwner'])
            ->where(function ($q) {
                $q->whereHas('funnelStage', function ($fq) {
                    $fq->where('name', 'like', '%won%');
                })
                ->orWhereHas('salesOrders', function ($soq) {
                    $soq->whereIn('order_status', ['confirmed', 'delivered', 'active']);
                });
            })
            ->get();

        $riskReports = collect();

        foreach ($clients as $client) {
            $health = $this->healthScoreService->calculateHealthScore($client);
            $churnIndicators = $this->evaluateChurnSignals($client, $health);

            if ($churnIndicators['risk_level'] !== 'low') {
                $highlight = $this->upsertChurnHighlight($client, $health, $churnIndicators);

                $riskReports->push([
                    'lead_id' => $client->id,
                    'company_name' => $client->company_name,
                    'health_score' => $health->overall_score,
                    'health_status' => $health->health_status,
                    'risk_level' => $churnIndicators['risk_level'],
                    'primary_risk_factor' => $churnIndicators['primary_factor'],
                    'recommended_intervention' => $churnIndicators['intervention'],
                    'highlight_id' => $highlight->id,
                ]);
            }
        }

        Log::info("[ChurnRiskDetection] Scanned {$clients->count()} client accounts. Identified {$riskReports->count()} churn risk flags.");

        return $riskReports;
    }

    /**
     * Evaluate explicit churn risk factors.
     */
    private function evaluateChurnSignals(Lead $client, CustomerHealthScore $health): array
    {
        $latestActivity = $client->activities->first();
        $daysInactive = $latestActivity && $latestActivity->activity_date
            ? (int) Carbon::parse($latestActivity->activity_date)->diffInDays(now())
            : 40;

        $delayedMilestones = $client->onboardingMilestones->filter(
            fn ($m) => $m->status === 'delayed' || ($m->target_date && $m->target_date < now() && $m->status !== 'completed')
        )->count();

        $signals = [];
        $riskLevel = 'low';

        // Critical Churn Trigger: Severe inactivity or health score < 40
        if ($health->overall_score < 40 || $daysInactive >= 30) {
            $riskLevel = 'critical';
            $signals[] = "High inactivity: {$daysInactive} days without touchpoint.";
            if ($health->overall_score < 40) {
                $signals[] = "Health score collapsed to {$health->overall_score}/100.";
            }
        } elseif ($health->overall_score < 60 || $delayedMilestones >= 2 || $daysInactive >= 14) {
            $riskLevel = 'high';
            if ($delayedMilestones > 0) {
                $signals[] = "Onboarding friction: {$delayedMilestones} milestone(s) delayed.";
            }
            if ($daysInactive >= 14) {
                $signals[] = "Communication lull: {$daysInactive} days since last interaction.";
            }
        } elseif ($health->overall_score < 75) {
            $riskLevel = 'medium';
            $signals[] = 'Moderate health score decline.';
        }

        $primaryFactor = !empty($signals) ? $signals[0] : 'Normal account baseline';

        $intervention = match ($riskLevel) {
            'critical' => "Urgent executive escalation: Schedule C-level alignment check-in with {$client->company_name} within 48h.",
            'high' => "Assign CSM technical audit and conduct adoption review meeting with {$client->company_name}.",
            'medium' => "CSM regular value check-in to unblock pending onboarding items.",
            default => 'Maintain regular bi-weekly communication cadence.',
        };

        return [
            'risk_level' => $riskLevel,
            'signals' => $signals,
            'primary_factor' => $primaryFactor,
            'intervention' => $intervention,
            'days_inactive' => $daysInactive,
            'delayed_milestones' => $delayedMilestones,
        ];
    }

    /**
     * Upsert an AiAttentionHighlight to alert CSM and Management.
     */
    private function upsertChurnHighlight(Lead $client, CustomerHealthScore $health, array $signals): AiAttentionHighlight
    {
        $existing = AiAttentionHighlight::where('entity_type', Lead::class)
            ->where('entity_id', $client->id)
            ->where('category', 'Churn Risk')
            ->where('status', 'open')
            ->first();

        $severity = $signals['risk_level'] === 'critical' ? 'critical' : 'high';
        $title = "Churn Warning: {$client->company_name} ({$signals['risk_level']} risk - Health: {$health->overall_score})";
        $reason = $signals['primary_factor'] . " Risk tier evaluated as '{$signals['risk_level']}'.";

        $evidence = [
            'overall_health_score' => $health->overall_score,
            'health_status' => $health->health_status,
            'risk_level' => $signals['risk_level'],
            'days_inactive' => $signals['days_inactive'],
            'delayed_milestones' => $signals['delayed_milestones'],
            'detected_signals' => $signals['signals'],
            'csm_owner' => $client->csmOwner?->name ?? 'Unassigned',
        ];

        if ($existing) {
            $existing->update([
                'title' => $title,
                'severity' => $severity,
                'reason' => $reason,
                'evidence_json' => $evidence,
                'recommended_action' => $signals['intervention'],
                'due_date' => now()->addDay(),
            ]);

            return $existing;
        }

        return AiAttentionHighlight::create([
            'entity_type' => Lead::class,
            'entity_id' => $client->id,
            'feature_key' => 'churn_risk_detection',
            'title' => $title,
            'category' => 'Churn Risk',
            'severity' => $severity,
            'reason' => $reason,
            'evidence_json' => $evidence,
            'recommended_action' => $signals['intervention'],
            'status' => 'open',
            'assigned_to' => $client->csm_owner_id ?? $client->owner_id,
            'due_date' => now()->addDay(),
        ]);
    }
}
