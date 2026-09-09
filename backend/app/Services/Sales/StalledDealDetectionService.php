<?php

namespace App\Services\Sales;

use App\Models\AiAttentionHighlight;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class StalledDealDetectionService
{
    /**
     * Default stalled threshold in days when not specified per stage.
     */
    public const DEFAULT_STALLED_DAYS = 14;

    /**
     * Stalled thresholds by stage name keywords (in days).
     */
    public const STAGE_THRESHOLDS = [
        'discovery' => 14,
        'qualification' => 14,
        'demo' => 10,
        'solution' => 10,
        'proposal' => 7,
        'negotiation' => 7,
        'closing' => 5,
    ];

    /**
     * Scan and detect stalled leads, creating/updating AiAttentionHighlights.
     *
     * @param int|null $customThresholdDays Override threshold for all open stages
     * @return Collection<int, array<string, mixed>> Detected stalled deals report
     */
    public function detectStalledLeads(?int $customThresholdDays = null): Collection
    {
        // Find open leads that are in a funnel stage and not disqualified/closed
        $leads = Lead::with(['funnelStage', 'activities' => fn ($q) => $q->latest('activity_date'), 'owner'])
            ->whereNotNull('funnel_stage_id')
            ->whereNotIn('qualification_status', ['unqualified', 'disqualified'])
            ->get();

        $stalledReport = collect();

        foreach ($leads as $lead) {
            $stageName = strtolower($lead->funnelStage?->name ?? '');

            // Skip closed won / lost stages
            if (str_contains($stageName, 'won') || str_contains($stageName, 'lost') || str_contains($stageName, 'closed')) {
                continue;
            }

            $threshold = $customThresholdDays ?? $this->resolveThresholdForStage($stageName);
            $lastActivityDate = $this->determineLastActivityDate($lead);
            $daysInactive = (int) $lastActivityDate->diffInDays(now());

            if ($daysInactive >= $threshold) {
                $severity = $daysInactive >= ($threshold * 2) ? 'critical' : 'high';
                $recoveryPlan = $this->buildRecoveryPlan($lead, $daysInactive, $stageName);

                $highlight = $this->upsertStalledHighlight($lead, $daysInactive, $threshold, $severity, $recoveryPlan);

                $stalledReport->push([
                    'lead_id' => $lead->id,
                    'company_name' => $lead->company_name,
                    'stage' => $lead->funnelStage?->name,
                    'owner' => $lead->owner?->name ?? 'Unassigned',
                    'days_inactive' => $daysInactive,
                    'threshold_days' => $threshold,
                    'severity' => $severity,
                    'highlight_id' => $highlight->id,
                    'recovery_action' => $recoveryPlan['primary_action'],
                    'playbook' => $recoveryPlan['playbook_steps'],
                ]);
            }
        }

        Log::info("[StalledDealDetection] Processed {$leads->count()} open leads. Found {$stalledReport->count()} stalled deals.");

        return $stalledReport;
    }

    /**
     * Determine threshold days based on stage name.
     */
    public function resolveThresholdForStage(string $stageName): int
    {
        $normalized = strtolower($stageName);

        foreach (self::STAGE_THRESHOLDS as $keyword => $days) {
            if (str_contains($normalized, $keyword)) {
                return $days;
            }
        }

        return self::DEFAULT_STALLED_DAYS;
    }

    /**
     * Determine the latest touchpoint date for the lead.
     */
    public function determineLastActivityDate(Lead $lead): Carbon
    {
        $latestActivity = $lead->activities->first();

        if ($latestActivity && $latestActivity->activity_date) {
            return Carbon::parse($latestActivity->activity_date);
        }

        return $lead->updated_at ?? $lead->created_at ?? now()->subDays(30);
    }

    /**
     * Generate structured playbook recommendations for re-engaging stalled deals.
     */
    private function buildRecoveryPlan(Lead $lead, int $daysInactive, string $stageName): array
    {
        $championName = $lead->authority ?? 'Key Stakeholder';
        $company = $lead->company_name;

        if (str_contains($stageName, 'proposal') || str_contains($stageName, 'negotiation')) {
            return [
                'primary_action' => "Schedule executive sponsor re-alignment or revised commercial review for {$company}",
                'playbook_steps' => [
                    "Send high-touch executive check-in to {$championName} addressing potential pricing or budget constraints.",
                    "Review commercial proposal concessions (e.g. phased onboarding, payment milestone adjustments).",
                    "Engage Presales / Solution Architect to address any lingering security, procurement, or integration blockers.",
                ],
            ];
        }

        if (str_contains($stageName, 'demo') || str_contains($stageName, 'solution')) {
            return [
                'primary_action' => "Deliver targeted use-case proof or ROI snapshot to revive interest",
                'playbook_steps' => [
                    "Share a concise 1-page business case or customer story aligned with {$company}'s industry.",
                    "Send a personalized recap video/walkthrough tackling open concerns.",
                    "Propose a mini proof-of-concept (PoC) or collaborative technical workshop.",
                ],
            ];
        }

        return [
            'primary_action' => "Initiate multi-channel re-engagement sequence (Email + WhatsApp touchpoint)",
            'playbook_steps' => [
                "Trigger personalized WhatsApp check-in to re-validate current project timeline.",
                "Send 'break-up' or value-drop email inquiring if business priorities have shifted.",
                "Assign secondary SDR or account executive to reconnect if no response within 48 hours.",
            ],
        ];
    }

    /**
     * Upsert an AiAttentionHighlight to avoid duplicate active stalled highlights.
     */
    private function upsertStalledHighlight(
        Lead $lead,
        int $daysInactive,
        int $threshold,
        string $severity,
        array $recoveryPlan
    ): AiAttentionHighlight {
        $existing = AiAttentionHighlight::where('entity_type', Lead::class)
            ->where('entity_id', $lead->id)
            ->where('category', 'Stalled Deal')
            ->where('status', 'open')
            ->first();

        $title = "Stalled Deal: {$lead->company_name} ({$daysInactive} days inactive)";
        $reason = "No activity or touchpoint logged for {$daysInactive} days in '{$lead->funnelStage?->name}' stage (threshold: {$threshold} days).";

        $evidence = [
            'days_inactive' => $daysInactive,
            'threshold_days' => $threshold,
            'current_stage' => $lead->funnelStage?->name,
            'owner' => $lead->owner?->name,
            'last_touchpoint' => $this->determineLastActivityDate($lead)->toIso8601String(),
            'recovery_playbook' => $recoveryPlan['playbook_steps'],
        ];

        if ($existing) {
            $existing->update([
                'title' => $title,
                'severity' => $severity,
                'reason' => $reason,
                'evidence_json' => $evidence,
                'recommended_action' => $recoveryPlan['primary_action'],
                'due_date' => now()->addDays(2),
            ]);

            return $existing;
        }

        return AiAttentionHighlight::create([
            'entity_type' => Lead::class,
            'entity_id' => $lead->id,
            'feature_key' => 'stalled_deal_detection',
            'title' => $title,
            'category' => 'Stalled Deal',
            'severity' => $severity,
            'reason' => $reason,
            'evidence_json' => $evidence,
            'recommended_action' => $recoveryPlan['primary_action'],
            'status' => 'open',
            'assigned_to' => $lead->owner_id,
            'due_date' => now()->addDays(2),
        ]);
    }
}
