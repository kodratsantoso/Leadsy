<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Sales\CompetitiveBattleCardService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Generates a Competitive Battle Card automatically once a competitor name is
 * confirmed — either by a sales rep logging it explicitly on an activity, or
 * by AI extracting it from a meeting summary/transcript. Never fires on an
 * AI-guessed value the moment it's merely detected; both callers check
 * CompetitiveBattleCardService::isMeaningfulCompetitorName() first.
 */
class GenerateBattleCardJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public function __construct(
        public readonly int $leadId,
        public readonly string $competitorName
    ) {}

    public function handle(CompetitiveBattleCardService $service): void
    {
        $lead = Lead::find($this->leadId);
        if (! $lead) {
            Log::warning("[GenerateBattleCardJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $card = $service->generateBattleCard($lead, $this->competitorName);
            Log::info("[GenerateBattleCardJob] Generated battle card for lead {$this->leadId} vs '{$card->competitor_name}'.");
        } catch (\Throwable $e) {
            Log::error("[GenerateBattleCardJob] Failed for lead {$this->leadId}: " . $e->getMessage());
        }
    }
}
