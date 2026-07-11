<?php

namespace App\Jobs;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\Lead\RevenueIntelligenceAnalysisService;
use App\Services\Lead\LeadAIAnalysisService;
use App\Services\Lead\ConversionPredictionService;
use App\Services\Lead\RevenueRuleEngineService;
use App\Services\Audit\AuditService;
use Illuminate\Support\Facades\Log;
use Throwable;

class RunLeadIntelligenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 120;
    public $tries = 2;

    public function __construct(public int $leadId)
    {
    }

    public function handle(): void
    {
        $lead = Lead::find($this->leadId);
        if (!$lead) {
            return;
        }

        try {
            // 1. Revenue Intelligence Analysis
            $riService = app(RevenueIntelligenceAnalysisService::class);
            $riResult = $riService->analyze($lead);
            AuditService::log('revenue_analysis', 'leads', $lead, null, [
                'intent_level' => $riResult->intent_level,
                'probability_to_close' => $riResult->probability_to_close,
                'confidence' => $riResult->confidence,
                'status' => $riResult->status,
            ]);

            // 2. AI Perception (Lead Analysis)
            $aiAnalysisService = app(LeadAIAnalysisService::class);
            $aiResult = $aiAnalysisService->analyzeLead($lead);
            AuditService::log('analyze', 'leads', $lead, null, [
                'relevance_score' => $aiResult->relevance_score,
                'urgency_level' => $aiResult->urgency_level,
                'risk_insight' => $aiResult->risk_insight,
            ]);

            // 3. Conversion Prediction
            $cpService = app(ConversionPredictionService::class);
            $cpResult = $cpService->predict($lead);
            AuditService::log('predict_conversion', 'leads', $lead, null, [
                'probability' => $cpResult['probability_to_close'] ?? null,
            ]);

            // 4. Revenue Gate Check (Evaluate Rules)
            $gateService = app(RevenueRuleEngineService::class);
            // It just evaluates and creates actions internally (if any) or returns a JSON array.
            $gateService->evaluate($lead);

            Log::info("RunLeadIntelligenceJob completed successfully for lead {$lead->id}");
        } catch (Throwable $e) {
            Log::error("RunLeadIntelligenceJob failed for lead {$lead->id}: " . $e->getMessage());
            throw $e;
        }
    }
}
