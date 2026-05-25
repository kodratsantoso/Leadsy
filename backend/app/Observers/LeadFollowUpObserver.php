<?php

namespace App\Observers;

use App\Models\LeadFollowUp;
use App\Models\LarkIntegration;
use App\Jobs\TriggerLarkAction;

class LeadFollowUpObserver
{
    /**
     * Handle the LeadFollowUp "created" event.
     */
    public function created(LeadFollowUp $followUp): void
    {
        // Trigger Lark task and calendar creation when follow-up is created
        $this->triggerLarkFollowUp($followUp);
    }

    /**
     * Trigger Lark actions for lead follow-up
     */
    private function triggerLarkFollowUp(LeadFollowUp $followUp): void
    {
        try {
            $lead = $followUp->lead;
            
            $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)
                ->where('is_active', true)
                ->first();

            if (!$integration || !$lead->owner) {
                return;
            }

            $larkSsoUser = $lead->owner->larkSsoUser;
            if (!$larkSsoUser) {
                return;
            }

            $leadData = [
                'company_name' => $lead->company_name,
                'industry' => $lead->industry?->name,
                'email' => $lead->email,
                'phone' => $lead->phone,
            ];

            $followUpData = [
                'notes' => $followUp->notes,
                'due_date' => $followUp->due_date,
                'assignee_id' => $larkSsoUser->lark_user_id,
            ];

            // Create Lark task if task module is enabled
            if ($integration->isModuleEnabled('task')) {
                TriggerLarkAction::dispatch(
                    $lead->tenant_id,
                    'create_follow_up_task',
                    ['follow_up' => $followUpData],
                    $larkSsoUser->lark_user_id,
                    (string) $lead->id
                );
            }

            // Create Lark calendar event if calendar module is enabled
            if ($integration->isModuleEnabled('calendar')) {
                TriggerLarkAction::dispatch(
                    $lead->tenant_id,
                    'create_follow_up_event',
                    ['follow_up' => $followUpData],
                    $larkSsoUser->lark_user_id,
                    (string) $lead->id
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to trigger Lark follow-up actions', [
                'follow_up_id' => $followUp->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
