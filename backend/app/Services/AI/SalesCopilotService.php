<?php

namespace App\Services\AI;

use App\Models\Lead;
use Illuminate\Support\Facades\Log;

class SalesCopilotService
{
    public function __construct(
        private AiOrchestrationService $ai
    ) {}

    /**
     * Interactive sales assistant with full lead memory.
     */
    public function chat(Lead $lead, string $userMessage, array $history = []): array
    {
        $lead->loadMissing(['funnelStage', 'industry', 'contacts', 'activities']);

        $contextSummary = $this->buildLeadContext($lead);

        $systemPrompt = "You are Leadsy AI Sales Copilot, an elite B2B sales strategist and deal coach assisting Account Executives and Presales in Indonesia. "
            . "You have deep knowledge of enterprise software sales, MEDDPICC, BANTC qualification, and local Indonesian business negotiation nuances. "
            . "Be concise, tactical, empathetic, and actionable. Avoid generic fluff. When drafting messages (WhatsApp/Email), format them ready-to-send.\n\n"
            . "CURRENT LEAD CONTEXT:\n" . $contextSummary;

        $prompt = [
            'system' => $systemPrompt,
            'user' => $userMessage,
        ];

        $context = [
            'entity_id' => $lead->id,
            'entity_type' => 'lead',
            'lead_id' => $lead->id,
        ];

        $result = $this->ai->call('sales_copilot', $prompt, $context);

        if (!$result['success']) {
            // Fallback response if AI route is busy or unconfigured
            return [
                'success' => true,
                'content' => "Sebagai asisten sales Anda untuk {$lead->company_name}, saya sarankan untuk meninjau status BANTC dan menjadwalkan alignment call dengan Decision Maker terkait prioritas kuartal ini.",
                'model' => 'fallback-rule',
            ];
        }

        return $result;
    }

    private function buildLeadContext(Lead $lead): string
    {
        $contact = $lead->contacts->first();
        $jobTitle = $contact?->job_title ?? 'PIC';
        $contactInfo = $contact ? "{$contact->name} ({$jobTitle} - {$contact->phone})" : "Belum terdata";
        
        $latestActivities = $lead->activities()
            ->latest('created_at')
            ->limit(3)
            ->get()
            ->map(fn ($a) => "- [{$a->activity_type}] {$a->description}")
            ->implode("\n");

        return "Company: {$lead->company_name}\n"
            . "Industry: " . ($lead->industry?->name ?? 'B2B Enterprise') . "\n"
            . "Funnel Stage: " . ($lead->funnelStage?->name ?? 'Discovery') . "\n"
            . "Lead Score: " . ($lead->lead_score ?? 'Unassessed') . " (" . ($lead->qualification_status ?? 'New') . ")\n"
            . "Primary Contact: {$contactInfo}\n"
            . "BANTC Signals:\n"
            . "  - Budget: " . ($lead->budget ?: 'Belum terverifikasi') . "\n"
            . "  - Authority: " . ($lead->authority ?: 'Belum teridentifikasi') . "\n"
            . "  - Needs: " . ($lead->needs ?: 'Belum terdata') . "\n"
            . "  - Timeline: " . ($lead->timeline ?: 'Belum terkonfirmasi') . "\n"
            . "Recent Activities:\n" . ($latestActivities ?: "- Belum ada aktivitas tercatat");
    }
}
