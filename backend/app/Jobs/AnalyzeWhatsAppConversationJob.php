<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\WhatsappConversation;
use App\Models\WhatsappAiAnalysis;
use App\Services\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

class AnalyzeWhatsAppConversationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $conversationId;

    public function __construct(int $conversationId)
    {
        $this->conversationId = $conversationId;
    }

    public function handle(AiOrchestrationService $ai): void
    {
        $conversation = WhatsappConversation::with(['messages' => function($q) {
            $q->orderBy('sent_at', 'asc')->take(50);
        }, 'contact'])->find($this->conversationId);

        if (!$conversation || $conversation->messages->isEmpty()) {
            return;
        }

        $messagesText = $conversation->messages->map(function ($m) {
            $dir = $m->direction === 'inbound' ? 'Contact' : 'Us';
            return "[{$dir}] {$m->body}";
        })->join("\n");

        $contactName = $conversation->contact?->name ?? 'Unknown';
        $phone = $conversation->contact?->phone_number ?? '';

        // Try real AI first
        $result = $this->tryAiAnalysis($ai, $contactName, $phone, $messagesText);

        // Fallback to keyword heuristic if AI is not configured
        if (!$result) {
            $result = $this->keywordHeuristic($messagesText);
        }

        WhatsappAiAnalysis::updateOrCreate(
            ['conversation_id' => $conversation->id],
            [
                'provider'          => $result['provider'],
                'analysis_result'   => $result['label'],
                'confidence_score'  => $result['confidence'],
                'reasoning_summary' => $result['reasoning'],
                'analyzed_at'       => now(),
            ]
        );

        $conversation->update([
            'relevance_status' => match ($result['label']) {
                'yes'   => 'high',
                'maybe' => 'medium',
                default => 'low',
            }
        ]);

        Log::info('[WhatsApp AI] Analysis complete', [
            'conversation_id' => $conversation->id,
            'label' => $result['label'],
            'confidence' => $result['confidence'],
        ]);
    }

    /**
     * Attempt real AI analysis via AiOrchestrationService.
     */
    private function tryAiAnalysis(AiOrchestrationService $ai, string $contactName, string $phone, string $messagesText): ?array
    {
        $prompt = <<<PROMPT
You are analyzing a WhatsApp conversation to determine if it indicates a sales lead or customer opportunity.

Contact: {$contactName} ({$phone})

Conversation:
{$messagesText}

Analyze this conversation and return JSON with:
- lead_potential_label: "yes" | "maybe" | "no"
- confidence_score: float 0.0-1.0
- reasoning_summary: 2-3 sentence explanation
- signals_found: array of key signals (e.g. "pricing inquiry", "demo request", "product interest")
- recommended_next_action: string (e.g. "Schedule call", "Send proposal", "No action needed")

Return ONLY valid JSON, no markdown.
PROMPT;

        try {
            $result = $ai->call('whatsapp_analysis', $prompt, ['conversation_id' => $this->conversationId]);

            if ($result['success'] && $result['content']) {
                $parsed = json_decode($result['content'], true);
                if ($parsed && isset($parsed['lead_potential_label'])) {
                    return [
                        'provider'   => $result['model'] ?? 'ai',
                        'label'      => $parsed['lead_potential_label'],
                        'confidence' => $parsed['confidence_score'] ?? 0.5,
                        'reasoning'  => ($parsed['reasoning_summary'] ?? '') .
                            (isset($parsed['signals_found']) ? "\nSignals: " . implode(', ', $parsed['signals_found']) : '') .
                            (isset($parsed['recommended_next_action']) ? "\nNext: " . $parsed['recommended_next_action'] : ''),
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('[WhatsApp AI] Real AI failed, falling back to heuristic', ['error' => $e->getMessage()]);
        }

        return null; // Signal to use fallback
    }

    /**
     * Keyword-based heuristic fallback when no AI provider is configured.
     */
    private function keywordHeuristic(string $messagesText): array
    {
        $highSignals = ['price', 'pricing', 'demo', 'buy', 'purchase', 'proposal', 'quote', 'interested', 'budget'];
        $mediumSignals = ['cost', 'feature', 'plan', 'subscription', 'trial', 'how much', 'available'];

        $lower = strtolower($messagesText);
        $foundHigh = [];
        $foundMedium = [];

        foreach ($highSignals as $kw) {
            if (str_contains($lower, $kw)) $foundHigh[] = $kw;
        }
        foreach ($mediumSignals as $kw) {
            if (str_contains($lower, $kw)) $foundMedium[] = $kw;
        }

        if (!empty($foundHigh)) {
            return [
                'provider'   => 'keyword_heuristic',
                'label'      => 'yes',
                'confidence' => min(0.60 + count($foundHigh) * 0.1, 0.95),
                'reasoning'  => 'High-intent keywords found: ' . implode(', ', $foundHigh) . '. This conversation likely indicates purchase intent or active interest.',
            ];
        }

        if (!empty($foundMedium)) {
            return [
                'provider'   => 'keyword_heuristic',
                'label'      => 'maybe',
                'confidence' => min(0.40 + count($foundMedium) * 0.08, 0.70),
                'reasoning'  => 'Medium-intent keywords found: ' . implode(', ', $foundMedium) . '. Some interest indicators detected but not conclusive.',
            ];
        }

        return [
            'provider'   => 'keyword_heuristic',
            'label'      => 'no',
            'confidence' => 0.50,
            'reasoning'  => 'No clear business intent detected in the conversation.',
        ];
    }
}
