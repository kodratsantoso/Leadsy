<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadProductMatch;
use App\Models\Product;
use App\Services\AiOrchestrationService;

class LeadProductMatchingService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    public function calculateMatch(Lead $lead, Product $product): LeadProductMatch
    {
        $prompt = "Evaluate the relevance of Product: {$product->name} (Target: {$product->target_industry}) for Lead: {$lead->company_name} in Industry: " . ($lead->industry->name ?? 'unknown') . ". Return JSON with 'match_score' (0-100) and 'match_reason'.";
        $result = $this->ai->call('product_matching_analysis', $prompt);

        if ($result['success'] && $result['content']) {
            $data = json_decode($result['content'], true);
        } else {
            $data = [
                'match_score' => 50,
                'match_reason' => 'Fallback logic executed due to AI error.',
            ];
        }

        return $lead->productMatches()->create([
            'product_id' => $product->id,
            'match_score' => $data['match_score'] ?? 50,
            'match_reason' => $data['match_reason'] ?? '',
            'is_recommended' => ($data['match_score'] ?? 50) >= 70,
        ]);
    }
}
