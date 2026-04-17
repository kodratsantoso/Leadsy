<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadQualification;
use App\Services\AiOrchestrationService;

class LeadQualificationService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    public function qualifyLead(Lead $lead): LeadQualification
    {
        $prompt = "Evaluate if this lead is qualified: " . json_encode($lead->toArray()) . " Return JSON with 'qualified' (yes/maybe/no), 'business_type', 'company_size_band', 'reason'.";
        $result = $this->ai->call('qualification_analysis', $prompt);

        if ($result['success'] && $result['content']) {
            $data = json_decode($result['content'], true);
        } else {
            $data = [
                'qualified' => 'maybe',
                'business_type' => 'unknown',
                'company_size_band' => 'unknown',
                'reason' => 'AI fallback due to error or missing data.',
            ];
        }

        $qualification = $lead->qualifications()->create([
            'qualified' => $data['qualified'] ?? 'maybe',
            'business_type' => $data['business_type'] ?? 'unknown',
            'company_size_band' => $data['company_size_band'] ?? 'unknown',
            'qualification_reason' => $data['reason'] ?? '',
        ]);

        $lead->update(['qualification_status' => $data['qualified'] === 'yes' ? 'potential' : ($data['qualified'] === 'no' ? 'not_eligible' : 'pending')]);

        return $qualification;
    }
}
