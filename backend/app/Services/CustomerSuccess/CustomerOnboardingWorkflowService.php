<?php

namespace App\Services\CustomerSuccess;

use App\Models\CustomerOnboardingMilestone;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CustomerOnboardingWorkflowService
{
    /**
     * Generate standard or AI-tailored onboarding milestones for a client.
     *
     * @param Lead $lead
     * @param LeadSalesOrder|null $salesOrder
     * @return Collection<int, CustomerOnboardingMilestone>
     */
    public function generateOnboardingWorkflow(Lead $lead, ?LeadSalesOrder $salesOrder = null): Collection
    {
        // Remove existing pending/unstarted milestones if regenerating
        CustomerOnboardingMilestone::where('lead_id', $lead->id)
            ->where('status', 'pending')
            ->delete();

        $csmId = $lead->csm_owner_id ?? $lead->owner_id ?? null;
        $productName = $lead->product?->name ?? 'Enterprise Solution';
        $soNumber = $salesOrder?->sales_order_number ?? 'Direct Won';
        $startDate = $salesOrder?->contract_start_date ? Carbon::parse($salesOrder->contract_start_date) : now();

        $milestoneTemplates = [
            [
                'sequence' => 1,
                'title' => 'Project Kickoff & Stakeholder Alignment',
                'description' => "Conduct formal onboarding kickoff meeting for {$lead->company_name}. Align executive sponsors, define communication cadence, and confirm scope.",
                'days_offset' => 3,
                'deliverables' => [
                    'Schedule kickoff meeting with client project lead',
                    'Deliver onboarding welcome kit and access credentials',
                    'Confirm primary administrative contact and technical champion',
                ],
            ],
            [
                'sequence' => 2,
                'title' => 'Technical Setup & Data Integration',
                'description' => "Configure {$productName} tenant, establish API/data sync, and verify user provisioning.",
                'days_offset' => 10,
                'deliverables' => [
                    'Complete system provisioning & workspace setup',
                    'Execute initial data migration or contact list upload',
                    'Validate third-party integrations (WhatsApp, Lark, or CRM)',
                ],
            ],
            [
                'sequence' => 3,
                'title' => 'User Training & Playbook Enablement',
                'description' => "Train client core team and administrators on daily workflows, pipeline tracking, and reporting.",
                'days_offset' => 18,
                'deliverables' => [
                    'Conduct live administrator training session',
                    'Deliver recorded walkthroughs and quick-reference guides',
                    'Verify user login adoption (> 70% active users)',
                ],
            ],
            [
                'sequence' => 4,
                'title' => 'Go-Live Verification & First Value Delivery',
                'description' => "Client executes first operational cycle in production. Validate initial deliverables and resolve early friction.",
                'days_offset' => 30,
                'deliverables' => [
                    'Client generates first live output / campaign in production',
                    '30-day health review call with CSM',
                    'Sign-off on initial Go-Live acceptance',
                ],
            ],
            [
                'sequence' => 5,
                'title' => 'Quarterly Business Review (QBR) & Expansion Readiness',
                'description' => "Evaluate 90-day ROI, present adoption metrics, and identify future expansion / upsell opportunities.",
                'days_offset' => 90,
                'deliverables' => [
                    'Compile 90-day adoption and ROI summary report',
                    'Conduct executive milestone check-in',
                    'Review renewal timeline and upsell potential',
                ],
            ],
        ];

        $createdMilestones = collect();

        foreach ($milestoneTemplates as $tpl) {
            $created = CustomerOnboardingMilestone::create([
                'lead_id' => $lead->id,
                'sales_order_id' => $salesOrder?->id,
                'title' => $tpl['title'],
                'description' => $tpl['description'],
                'sequence' => $tpl['sequence'],
                'target_date' => $startDate->copy()->addDays($tpl['days_offset'])->toDateString(),
                'status' => $tpl['sequence'] === 1 ? 'in_progress' : 'pending',
                'owner_id' => $csmId,
                'deliverables' => $tpl['deliverables'],
            ]);

            $createdMilestones->push($created);
        }

        return $createdMilestones;
    }

    /**
     * Mark a milestone as completed, updating timestamp and advancing subsequent milestone.
     */
    public function completeMilestone(CustomerOnboardingMilestone $milestone): CustomerOnboardingMilestone
    {
        $milestone->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Automatically mark next sequence milestone as in_progress if currently pending
        $next = CustomerOnboardingMilestone::where('lead_id', $milestone->lead_id)
            ->where('sequence', '>', $milestone->sequence)
            ->orderBy('sequence')
            ->first();

        if ($next && $next->status === 'pending') {
            $next->update(['status' => 'in_progress']);
        }

        return $milestone;
    }
}
