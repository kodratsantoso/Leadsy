<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsGovernanceRule;

class PsBlockerValidationService
{
    /**
     * Evaluate the estimation against hardcoded rules and dynamic governance rules.
     * Returns an array of blocker messages. If empty, it's good to go.
     */
    public function getBlockers(PsEstimation $estimation): array
    {
        $blockers = [];
        $estimation->loadMissing('lines', 'category');

        // Hardcoded Blockers (Fundamental requirements)
        if ($estimation->lines->isEmpty()) {
            $blockers[] = [
                'type' => 'missing_tasks',
                'message' => 'Task breakdown is empty.',
                'overridable' => false,
            ];
        }

        if ($estimation->total_final_mandays <= 0) {
            $blockers[] = [
                'type' => 'zero_mandays',
                'message' => 'Total Final ManDays cannot be zero.',
                'overridable' => false,
            ];
        }

        $hasLowConfidence = $estimation->lines->contains('ai_confidence', 'low');
        if ($hasLowConfidence) {
            $blockers[] = [
                'type' => 'ai_confidence_low',
                'message' => 'Some AI-generated tasks have low confidence and require manual review.',
                'overridable' => true,
            ];
        }

        $hasMissingRoles = $estimation->lines->containsStrict('role_id', null);
        if ($hasMissingRoles) {
            $blockers[] = [
                'type' => 'missing_role',
                'message' => 'Some tasks are missing an assigned role.',
                'overridable' => false,
            ];
        }

        $hasUnjustifiedAdjustment = $estimation->lines->contains(function ($line) {
            return $line->manual_adjustment != 0 && empty($line->manual_adjustment_reason);
        });
        if ($hasUnjustifiedAdjustment) {
            $blockers[] = [
                'type' => 'missing_adjustment_reason',
                'message' => 'Manual ManDay adjustments exist without a provided reason.',
                'overridable' => false,
            ];
        }

        // Dynamic Governance Rules
        $rules = PsGovernanceRule::where('is_active', true)->get();
        foreach ($rules as $rule) {
            if ($rule->applies_to_service_category_id && $rule->applies_to_service_category_id !== $estimation->service_category_id) {
                continue;
            }

            if ($rule->rule_type === 'require_approval_over_mandays' && $estimation->total_final_mandays > $rule->threshold_value) {
                $blockers[] = [
                    'type' => 'threshold_exceeded',
                    'message' => "Total ManDays ({$estimation->total_final_mandays}) exceeds the allowed threshold of {$rule->threshold_value}.",
                    'overridable' => true,
                ];
            }

            if ($rule->rule_type === 'require_approval_over_fee' && $estimation->total_estimated_fee > $rule->threshold_value) {
                $blockers[] = [
                    'type' => 'fee_threshold_exceeded',
                    'message' => "Total Estimated Fee exceeds the allowed threshold of {$rule->threshold_value}.",
                    'overridable' => true,
                ];
            }
        }

        return $blockers;
    }
}
