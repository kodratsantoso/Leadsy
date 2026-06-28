<?php

namespace App\Observers;

use App\Jobs\TriggerLarkAction;
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

    /**
     * Handle the Lead "updated" event.
     */
    public function updated(Lead $lead): void
    {
        // Trigger Lark notifications when a lead is updated
        if ($lead->wasChanged(['company_name', 'email', 'phone', 'funnel_stage_id', 'qualification_status'])) {
            $this->triggerLarkNotification($lead, 'updated');
        }

        if ($lead->wasChanged([
            'company_name',
            'website',
            'email',
            'phone',
            'address',
            'business_category',
            'lead_score',
            'funnel_stage_id',
            'qualification_status',
            'owner_id',
            'external_place_id',
        ])) {
            $this->triggerLarkBaseSync($lead);
        }

        if ($lead->wasChanged([
            'eligibility_status',
            'score',
            'confidentiality_score',
        ])) {
            \App\Jobs\SyncLeadToLarkBaseJob::dispatch($lead->id);
        }
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
}
