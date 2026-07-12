<?php

namespace App\Observers;

use App\Jobs\TriggerLarkAction;
use App\Jobs\ProcessLarkMinutesLinkJob;
use App\Models\LarkIntegration;
use App\Models\Lead;
use Illuminate\Support\Facades\Log;

class LeadObserver
{
    /**
     * Handle the Lead "created" event.
     */
    public function created(Lead $lead): void
    {
        // Trigger Lark notifications when a new lead is created
        $this->triggerLarkNotification($lead, 'created');
        $this->triggerLarkBaseSync($lead);
    }

    public function updated(Lead $lead): void
    {
        // Trigger Lark notifications for specific fields only
        if ($lead->wasChanged(['company_name', 'email', 'phone', 'funnel_stage_id', 'qualification_status'])) {
            $this->triggerLarkNotification($lead, 'updated');
        }

        if ($lead->wasChanged(['estimated_closing_amount', 'funnel_stage_id'])) {
            $this->triggerConfidentialityAssessment($lead);
        }

        // Trigger Lark Minutes fetch & AI processing if meeting link is added/updated
        if ($lead->wasChanged('meeting_link') && !empty($lead->meeting_link)) {
            ProcessLarkMinutesLinkJob::dispatch((string) $lead->id, $lead->meeting_link);
        }

        // Trigger Lark Base Sync on ANY change to the lead data
        $this->triggerLarkBaseSync($lead);
    }

    /**
     * Handle the Lead "deleted" event.
     */
    public function deleted(Lead $lead): void
    {
        // Handle lead deletion if needed
    }

    /**
     * Trigger Lark notification for lead actions
     */
    private function triggerLarkNotification(Lead $lead, string $action): void
    {
        try {
            $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)
                ->where('is_active', true)
                ->first();

            if (! $integration || ! $integration->isModuleEnabled('messenger')) {
                return;
            }

            // Get lead owner's Lark user ID if available
            if ($lead->owner) {
                $larkSsoUser = $lead->owner->larkSsoUser;

                if (! $larkSsoUser) {
                    return;
                }

                $leadData = [
                    'company_name' => $lead->company_name,
                    'industry' => $lead->industry?->name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'lead_score' => $lead->lead_score,
                    'funnel_stage' => $lead->funnelStage?->name,
                    'qualification_status' => $lead->qualification_status,
                ];

                TriggerLarkAction::dispatch(
                    $lead->tenant_id,
                    'send_lead_notification',
                    [
                        'lead' => $leadData,
                        'action' => $action,
                        'owner_name' => $lead->owner->name,
                    ],
                    $larkSsoUser->lark_user_id,
                    (string) $lead->id
                );
            }
        } catch (\Exception $e) {
            Log::error('Failed to trigger Lark notification', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function triggerLarkBaseSync(Lead $lead): void
    {
        try {
            $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)
                ->where('is_active', true)
                ->first();

            if (! $integration || ! $integration->isModuleEnabled('base')) {
                return;
            }

            TriggerLarkAction::dispatch(
                $lead->tenant_id,
                'sync_lead_to_base',
                [],
                null,
                (string) $lead->id
            );
        } catch (\Exception $e) {
            Log::error('Failed to trigger Lark Base sync', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function triggerConfidentialityAssessment(Lead $lead): void
    {
        try {
            $service = app(\App\Services\ConfidentialityAssessmentService::class);
            $assessment = $service->assess($lead);

            $lead->confidentialityAssessment()->updateOrCreate(
                ['entity_id' => $lead->id, 'entity_type' => Lead::class],
                [
                    'level' => $assessment['level'],
                    'score' => $assessment['score'],
                    'classification_reason' => $assessment['classification_reason'],
                    'basis' => $assessment['basis'],
                    'recommended_access_handling' => $assessment['recommended_access_handling'],
                    'special_attention' => $assessment['special_attention'],
                ]
            );
        } catch (\Exception $e) {
            Log::error('Failed to update confidentiality assessment', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
