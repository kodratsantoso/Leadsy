<?php

namespace App\Services\CustomerSuccess;

use App\Models\Lead;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

class CustomerSuccessPlaybookService
{
    public function __construct(
        private AiOrchestrationService $aiOrchestrator,
    ) {}

    /**
     * Generate an interactive, context-aware tactical playbook for a CSM.
     *
     * @param Lead $lead
     * @param string $scenario 'churn_risk_recovery', 'onboarding_stalled', 'executive_departure', 'unresolved_complaint', 'expansion_pitch'
     * @return array<string, mixed>
     */
    public function generatePlaybook(Lead $lead, string $scenario = 'churn_risk_recovery'): array
    {
        $company = $lead->company_name;
        $csmName = $lead->csmOwner?->name ?? $lead->owner?->name ?? 'CSM';
        $healthScore = $lead->latestHealthScore?->overall_score ?? 70;

        $contextPayload = [
            'company_name' => $company,
            'csm_name' => $csmName,
            'scenario' => $scenario,
            'health_score' => $healthScore,
            'sponsor' => $lead->authority ?? 'Executive Sponsor',
            'notes' => $lead->needs ?? 'Enterprise CRM workflow',
        ];

        $prompt = "You are a Customer Success strategist. Given the account context below, produce a tactical playbook "
            ."as strict JSON with keys: scenario_title (string), immediate_actions (string[]), diagnostic_questions (string[]), "
            ."stakeholder_talking_points (string[]), outreach_message_draft (string), expected_outcome (string). "
            ."Respond with JSON only, no markdown fences.\n\nAccount context:\n"
            .json_encode($contextPayload, JSON_PRETTY_PRINT);

        try {
            $aiResult = $this->aiOrchestrator->call('cs_playbook_ai', $prompt, ['lead_id' => $lead->id]);
            $parsed = (!empty($aiResult['success']) && !empty($aiResult['content']))
                ? $this->parseResponse($aiResult['content'])
                : [];

            if (!empty($parsed['scenario_title'])) {
                return array_merge(['scenario_key' => $scenario, 'company_name' => $company], $parsed);
            }
        } catch (\Throwable $e) {
            Log::warning("[CustomerSuccessPlaybookService] AI playbook fallback for {$company}: " . $e->getMessage());
        }

        return $this->buildFallbackPlaybook($lead, $scenario, $csmName);
    }

    private function parseResponse($response): array
    {
        if (is_array($response)) {
            return $response;
        }

        if (is_string($response)) {
            $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($response));
            $clean = preg_replace('/\s*```$/', '', $clean);
            $decoded = json_decode($clean, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function buildFallbackPlaybook(Lead $lead, string $scenario, string $csmName): array
    {
        $company = $lead->company_name;
        $sponsor = $lead->authority ?: 'Bpk/Ibu Pimpinan';

        $titles = [
            'churn_risk_recovery' => "Emergency Health Recovery Playbook for {$company}",
            'onboarding_stalled' => "Onboarding Unblocking & Value Acceleration for {$company}",
            'executive_departure' => "Executive Sponsor Transition & Re-Alignment Playbook",
            'unresolved_complaint' => "Service Recovery & Critical Escalation Playbook",
            'expansion_pitch' => "Account Expansion & Cross-Sell Pitch Playbook",
        ];

        $title = $titles[$scenario] ?? "Customer Success Tactical Playbook for {$company}";

        return [
            'scenario_key' => $scenario,
            'company_name' => $company,
            'scenario_title' => $title,
            'immediate_actions' => [
                "Within 24 Hours: Review latest touchpoint logs and send personal check-in note to {$sponsor}.",
                "Within 72 Hours: Host a 20-minute alignment huddle to address immediate operational friction.",
                "Within 7 Days: Deliver documented resolution report and confirm revised milestone timeline.",
            ],
            'diagnostic_questions' => [
                "Apakah ada kendala teknis atau perubahan prioritas tim internal yang memperlambat adopsi sistem?",
                "Bagaimana Leadsy dapat lebih optimal mendukung target kuartal perusahaan saat ini?",
                "Apakah ada ekspektasi atau janji implementasi awal yang belum sepenuhnya terpenuhi?",
            ],
            'stakeholder_talking_points' => [
                "Tegaskan komitmen Leadsy untuk menjamin keberhasilan operasional tim {$company}.",
                "Tawarkan sesi re-training atau pendampingan teknis gratis untuk tim operasional.",
                "Posisikan CSM sebagai dedicated advisor yang siap mengawal penyelesaian masalah hingga tuntas.",
            ],
            'outreach_message_draft' => "Halo {$sponsor}, perkenalkan saya {$csmName} dari Customer Success Leadsy. Saya ingin memastikan bahwa operasional tim {$company} berjalan lancar. Bolehkah kami luangkan waktu 15 menit minggu ini untuk mendengarkan masukan dan memastikan semua kebutuhan sistem terpenuhi dengan baik? Terima kasih banyak.",
            'expected_outcome' => "Membangun kembali kepercayaan stakeholder, mengidentifikasi akar kendala adopsi, dan menstabilkan tren kesehatan akun menjadi healthy/thriving.",
        ];
    }
}
