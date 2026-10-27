<?php

namespace App\Services\Sales;

use App\Models\CadenceStepLog;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadCadenceEnrollment;
use App\Models\SalesCadence;
use App\Models\SalesCadenceStep;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalesCadenceExecutionService
{
    /**
     * Enroll a lead into a sales cadence.
     */
    public function enrollLead(Lead $lead, int $cadenceId, ?int $userId = null): LeadCadenceEnrollment
    {
        return DB::transaction(function () use ($lead, $cadenceId, $userId) {
            $cadence = SalesCadence::with('steps')->findOrFail($cadenceId);
            $firstStep = $cadence->steps()->orderBy('step_number')->first();

            $delayDays = $firstStep ? (int) $firstStep->delay_days : 0;
            $nextExecution = now()->addDays($delayDays);

            $enrollment = LeadCadenceEnrollment::create([
                'tenant_id' => $lead->tenant_id,
                'sales_cadence_id' => $cadence->id,
                'lead_id' => $lead->id,
                'enrolled_by' => $userId,
                'current_step_id' => $firstStep?->id,
                'current_step_number' => 1,
                'status' => 'active',
                'next_execution_at' => $nextExecution,
                'enrolled_at' => now(),
            ]);

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $userId,
                'activity_type' => 'cadence_enrolled',
                'description' => "Lead enrolled in Sales Cadence: '{$cadence->name}'. Step 1 scheduled for {$nextExecution->toFormattedDateString()}.",
            ]);

            return $enrollment;
        });
    }

    /**
     * Execute all active cadence enrollments that are due.
     */
    public function executeDueEnrollments(): int
    {
        $dueEnrollments = LeadCadenceEnrollment::with(['cadence.steps', 'lead.contacts'])
            ->where('status', 'active')
            ->where('next_execution_at', '<=', now())
            ->limit(100)
            ->get();

        $executedCount = 0;

        foreach ($dueEnrollments as $enrollment) {
            try {
                $this->executeEnrollmentStep($enrollment);
                $executedCount++;
            } catch (\Throwable $e) {
                Log::error("[CadenceEngine] Failed executing step for enrollment #{$enrollment->id}: " . $e->getMessage());
            }
        }

        return $executedCount;
    }

    /**
     * Execute single step for an enrollment.
     */
    public function executeEnrollmentStep(LeadCadenceEnrollment $enrollment): void
    {
        $cadence = $enrollment->cadence;
        $step = $cadence->steps()->where('step_number', $enrollment->current_step_number)->first();

        if (!$step) {
            $enrollment->update([
                'status' => 'completed',
                'completed_at' => now(),
                'next_execution_at' => null,
            ]);
            return;
        }

        $lead = $enrollment->lead;
        $renderedContent = $this->renderTemplate($step->template_body, $lead);

        // 1. Create activity / dispatch channel action
        $logStatus = 'executed';
        $executionError = null;

        try {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $enrollment->enrolled_by,
                'activity_type' => 'cadence_step_' . $step->channel,
                'description' => "Cadence '{$cadence->name}' Step #{$step->step_number} ({$step->channel}): " . mb_substr($renderedContent, 0, 200),
            ]);
        } catch (\Throwable $e) {
            $logStatus = 'failed';
            $executionError = $e->getMessage();
        }

        // 2. Log step execution
        CadenceStepLog::create([
            'lead_cadence_enrollment_id' => $enrollment->id,
            'sales_cadence_step_id' => $step->id,
            'lead_id' => $lead->id,
            'channel' => $step->channel,
            'status' => $logStatus,
            'rendered_content' => $renderedContent,
            'execution_error' => $executionError,
            'executed_at' => now(),
        ]);

        // 3. Move to next step or complete
        $nextStep = $cadence->steps()->where('step_number', '>', $step->step_number)->orderBy('step_number')->first();

        if ($nextStep) {
            $delay = (int) $nextStep->delay_days;
            $enrollment->update([
                'current_step_id' => $nextStep->id,
                'current_step_number' => $nextStep->step_number,
                'next_execution_at' => now()->addDays($delay),
            ]);
        } else {
            $enrollment->update([
                'status' => 'completed',
                'completed_at' => now(),
                'next_execution_at' => null,
            ]);
        }
    }

    /**
     * Personalize message template variables.
     */
    private function renderTemplate(string $template, Lead $lead): string
    {
        $contact = $lead->contacts()->first();
        $contactName = $contact ? $contact->name : 'Bapak/Ibu Pimpinan';

        $replacements = [
            '{{company_name}}' => $lead->company_name,
            '{{contact_name}}' => $contactName,
            '{{industry}}' => $lead->industry ? $lead->industry->name : 'Bisnis',
            '{{lead_score}}' => (string) ($lead->lead_score ?? '—'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }
}
