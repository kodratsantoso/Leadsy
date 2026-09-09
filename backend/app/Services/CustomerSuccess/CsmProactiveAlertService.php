<?php

namespace App\Services\CustomerSuccess;

use App\Models\AiAttentionHighlight;
use App\Models\CustomerFeedback;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class CsmProactiveAlertService
{
    public function __construct(
        private CustomerRenewalIntelligenceService $renewalService,
    ) {}

    /**
     * Scan all clients and generate proactive CSM highlights.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function runProactiveScan(): Collection
    {
        $alerts = collect();

        // 1. Renewal Window Scan (< 60 days to expiry)
        $renewalOpps = $this->renewalService->detectRenewalOpportunities();
        foreach ($renewalOpps as $opp) {
            if ($opp->days_until_expiration <= 60) {
                $highlight = $this->upsertRenewalAlert($opp);
                $alerts->push([
                    'type' => 'renewal_alert',
                    'lead_id' => $opp->lead_id,
                    'company_name' => $opp->lead->company_name,
                    'days_left' => $opp->days_until_expiration,
                    'highlight_id' => $highlight->id,
                ]);
            }
        }

        // 2. Unresolved Detractor Feedbacks
        $detractorFeedbacks = CustomerFeedback::with('lead')
            ->where('action_required', true)
            ->whereNull('resolved_at')
            ->get();

        foreach ($detractorFeedbacks as $fb) {
            $alerts->push([
                'type' => 'detractor_alert',
                'lead_id' => $fb->lead_id,
                'company_name' => $fb->lead->company_name,
                'survey_type' => $fb->survey_type,
                'score' => $fb->score,
            ]);
        }

        Log::info("[CsmProactiveAlert] Generated {$alerts->count()} proactive CSM alerts across active accounts.");

        return $alerts;
    }

    /**
     * Create or update a renewal proximity highlight.
     */
    private function upsertRenewalAlert($opp): AiAttentionHighlight
    {
        $lead = $opp->lead;
        $title = "Renewal Proximity: {$lead->company_name} ({$opp->days_until_expiration} days left)";
        $severity = $opp->days_until_expiration <= 30 ? 'critical' : 'high';

        $existing = AiAttentionHighlight::where('entity_type', Lead::class)
            ->where('entity_id', $lead->id)
            ->where('category', 'Renewal Alert')
            ->where('status', 'open')
            ->first();

        $evidence = [
            'contract_end' => $opp->current_contract_end,
            'days_left' => $opp->days_until_expiration,
            'contract_value' => $opp->estimated_value,
            'opportunity_id' => $opp->id,
        ];

        if ($existing) {
            $existing->update([
                'title' => $title,
                'severity' => $severity,
                'reason' => $opp->reasoning,
                'evidence_json' => $evidence,
                'recommended_action' => "Initiate renewal quote and align commercial terms with client champion.",
                'due_date' => now()->addDays(3),
            ]);

            return $existing;
        }

        return AiAttentionHighlight::create([
            'entity_type' => Lead::class,
            'entity_id' => $lead->id,
            'feature_key' => 'csm_renewal_alert',
            'title' => $title,
            'category' => 'Renewal Alert',
            'severity' => $severity,
            'reason' => $opp->reasoning,
            'evidence_json' => $evidence,
            'recommended_action' => "Initiate renewal quote and align commercial terms with client champion.",
            'status' => 'open',
            'assigned_to' => $lead->csm_owner_id ?? $lead->owner_id,
            'due_date' => now()->addDays(3),
        ]);
    }
}
