<?php

namespace App\Services\AI;

use App\Models\AiRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * AI Orchestration Service — BRD §3.10, §4, §11
 *
 * Responsibilities:
 *   - Route AI requests to the correct provider/model
 *   - Implement fallback logic
 *   - Track usage + cost
 *   - Template prompts for scoring, enrichment, parsing
 */
class AiOrchestrationService
{
    public function __construct(
        private AIPriorityResolverService $priorityResolver,
        private AIPromptTemplateService $promptTemplates,
    ) {
    }

    /**
     * Execute an AI call for a named function.
     *
     * @param  string  $functionName   e.g. 'lead_scoring', 'product_understanding'
     * @param  string  $promptContent  The user/system prompt body
     * @param  array   $context        Additional metadata
     * @return array{success: bool, content: string|null, tokens: array, cost: float, model: string}
     */
    public function call(string $functionName, string $promptContent, array $context = []): array
    {
        $routes = $this->priorityResolver->getRoutesForFeature($functionName);
        $promptContent = $this->promptTemplates->compilePrompt($functionName, $promptContent, $context);

        if ($routes->isEmpty()) {
            return $this->fail("No active route for function: {$functionName}");
        }

        $cachedResult = $this->getCachedResult($functionName, $promptContent, $context, $routes->first()?->cache_ttl_minutes);
        if ($cachedResult !== null) {
            return $cachedResult;
        }

        $lastError = 'unknown';

        foreach ($routes as $index => $route) {
            $isFallback = $index > 0;
            
            if ($isFallback) {
                Log::warning("[AI] Priority " . $routes[$index - 1]->priority . " model failed for {$functionName}. Trying Priority {$route->priority} fallback.", [
                    'previous_error' => $lastError,
                ]);
            }

            for ($attempt = 0; $attempt <= ($route->max_retries ?? 1); $attempt++) {
                $result = $this->tryModel($route, $functionName, $promptContent, $context, $route->timeout_seconds, $isFallback);
                if ($result['success']) {
                    $this->putCachedResult($functionName, $promptContent, $context, $route->cache_ttl_minutes, $result);
                    return $result;
                }
                $lastError = $result['error'] ?? 'unknown';
            }
        }

        return $this->fail("All AI feature routes exhausted for function: {$functionName}. Last error: {$lastError}");
    }

    /**
     * Score a lead: returns { score: 0-100, qualification_status, explanation }.
     */
    public function scoreLead(array $leadData, ?string $productReference = null): array
    {
        $prompt = $this->buildScoringPrompt($leadData, $productReference);
        $result = $this->call('lead_scoring', $prompt, ['lead_id' => $leadData['id'] ?? null]);

        if ($result['success'] && $result['content']) {
            $parsed = json_decode($result['content'], true);
            return [
                'success'              => true,
                'score'                => $parsed['score'] ?? 50,
                'qualification_status' => $parsed['qualification_status'] ?? 'pending',
                'explanation'          => $parsed['explanation'] ?? '',
                'tokens'               => $result['tokens'],
                'cost'                 => $result['cost'],
            ];
        }

        return ['success' => false, 'error' => $result['error'] ?? 'AI call failed'];
    }

    /**
     * Parse a product reference document/URL for AI-powered matching.
     */
    public function parseProductReference(string $content, string $sourceType = 'text'): array
    {
        $prompt = <<<PROMPT
        Analyse the following product reference material and extract:
        1. Target industries
        2. Key pain points addressed
        3. Ideal company profile (size, revenue, tech stack)
        4. Buyer persona
        5. Competitive advantages

        Source type: {$sourceType}
        Content:
        {$content}

        Return JSON with keys: target_industries, pain_points, ideal_company_profile, buyer_persona, competitive_advantages
        PROMPT;

        $result = $this->call('product_understanding', $prompt);

        if ($result['success'] && $result['content']) {
            return ['success' => true, 'data' => json_decode($result['content'], true)];
        }

        return ['success' => false, 'error' => $result['error'] ?? 'Parse failed'];
    }

    /* ──────────────────────────────────────────── */
    /*  PRIVATE                                     */
    /* ──────────────────────────────────────────── */

    private function tryModel($route, string $functionName, string $prompt, array $context, int $timeout, ?bool $isFallback = false): array
    {
        $model = $route->aiModel()->with('provider')->first();
        if (! $model || ! $model->provider) {
            return $this->fail('Model or provider not found');
        }

        $provider = $model->provider;
        $startMs  = hrtime(true);

        try {
            $apiKey  = $provider->decrypted_api_key;
            $baseUrl = $provider->base_url ?? $this->defaultBaseUrl($provider->slug);
            $body    = $this->buildRequestBody($provider->provider_type ?: $provider->slug, $model->name, $prompt, $route->max_tokens ?? $provider->max_tokens_default);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => $this->chatEndpoint($provider->provider_type ?: $provider->slug, $baseUrl, $model->name),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_POSTFIELDS     => json_encode($body),
                CURLOPT_HTTPHEADER     => $this->headers($provider->provider_type ?: $provider->slug, $apiKey),
            ]);

            $response   = curl_exec($ch);
            $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            $latencyMs = (int) ((hrtime(true) - $startMs) / 1_000_000);
            
            if ($response === false) {
                 return $this->fail("cURL Error: " . $curlError);
            }

            $decoded   = json_decode($response, true);

            if ($httpStatus < 200 || $httpStatus >= 300) {
                $this->logRequest($model, $functionName, null, null, 0, $latencyMs, 'failure', $response, $isFallback);
                return $this->fail("HTTP {$httpStatus}: " . ($decoded['error']['message'] ?? 'Unknown'));
            }

            // Extract content & tokens based on provider
            [$content, $promptTokens, $completionTokens] = $this->parseResponse($provider->provider_type ?: $provider->slug, $decoded);

            $cost = $this->estimateCost($model->cost_tier, $promptTokens, $completionTokens);

            $this->logRequest($model, $functionName, $promptTokens, $completionTokens, $cost, $latencyMs, 'success', null, $isFallback);

            return [
                'success' => true,
                'content' => $content,
                'model'   => $model->name,
                'tokens'  => ['prompt' => $promptTokens, 'completion' => $completionTokens],
                'cost'    => $cost,
            ];
        } catch (\Throwable $e) {
            $latencyMs = (int) ((hrtime(true) - $startMs) / 1_000_000);
            $this->logRequest($model, $functionName, null, null, 0, $latencyMs, 'failure', $e->getMessage(), $isFallback);

            return $this->fail($e->getMessage());
        }
    }

    private function buildScoringPrompt(array $leadData, ?string $productRef): string
    {
        $leadJson = json_encode($leadData, JSON_PRETTY_PRINT);
        $ref = $productRef ? "\n\nProduct Reference:\n{$productRef}" : '';

        return <<<PROMPT
        You are a lead qualification engine. Evaluate the following company and return a JSON object with:
        - score: integer 0-100
        - qualification_status: "eligible" | "potential" | "not_eligible"
        - explanation: string (2-3 sentences explaining the score)

        Company data:
        {$leadJson}
        {$ref}

        Return ONLY valid JSON, no markdown.
        PROMPT;
    }

    private function buildRequestBody(string $slug, string $modelName, string $prompt, ?int $maxTokens = null): array
    {
        return match ($slug) {
            'anthropic' => array_filter([
                'model'      => $modelName,
                'max_tokens' => $maxTokens ?? 1024,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ], fn ($value) => $value !== null),
            'google', 'gemini' => [
                'contents' => [['parts' => [['text' => $prompt]]]],
            ],
            default => array_filter([ // openai-compatible
                'model'    => $modelName,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a B2B sales intelligence assistant. Return valid JSON whenever the user requests JSON.'],
                    ['role' => 'user',   'content' => $prompt],
                ],
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => $maxTokens,
            ], fn ($value) => $value !== null),
        };
    }

    private function chatEndpoint(string $slug, string $baseUrl, string $modelName): string
    {
        return match ($slug) {
            'anthropic' => rtrim($baseUrl, '/') . '/messages',
            'google', 'gemini' => rtrim($baseUrl, '/') . '/models/' . $modelName . ':generateContent',
            default     => rtrim($baseUrl, '/') . '/chat/completions',
        };
    }

    private function headers(string $slug, string $apiKey): array
    {
        $common = ['Content-Type: application/json'];

        return match ($slug) {
            'anthropic' => array_merge($common, [
                "x-api-key: {$apiKey}",
                'anthropic-version: 2023-06-01',
            ]),
            'google', 'gemini' => array_merge($common, ["x-goog-api-key: {$apiKey}"]),
            default  => array_merge($common, ["Authorization: Bearer {$apiKey}"]),
        };
    }

    private function parseResponse(string $slug, array $decoded): array
    {
        return match ($slug) {
            'anthropic' => [
                $decoded['content'][0]['text'] ?? '',
                $decoded['usage']['input_tokens'] ?? 0,
                $decoded['usage']['output_tokens'] ?? 0,
            ],
            'google', 'gemini' => [
                $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '',
                $decoded['usageMetadata']['promptTokenCount'] ?? 0,
                $decoded['usageMetadata']['candidatesTokenCount'] ?? 0,
            ],
            default => [
                $decoded['choices'][0]['message']['content'] ?? '',
                $decoded['usage']['prompt_tokens'] ?? 0,
                $decoded['usage']['completion_tokens'] ?? 0,
            ],
        };
    }

    private function estimateCost(string $costTier, int $promptTokens, int $completionTokens): float
    {
        // Rough cost per 1M tokens (USD)
        $rates = match ($costTier) {
            'low'    => ['prompt' => 0.15,  'completion' => 0.60],
            'medium' => ['prompt' => 3.00,  'completion' => 15.00],
            'high'   => ['prompt' => 5.00,  'completion' => 15.00],
            default  => ['prompt' => 1.00,  'completion' => 3.00],
        };

        return round(
            ($promptTokens * $rates['prompt'] + $completionTokens * $rates['completion']) / 1_000_000,
            6,
        );
    }

    private function logRequest(
        $model,
        string $functionName,
        ?int $promptTokens,
        ?int $completionTokens,
        float $cost,
        int $latencyMs,
        string $status,
        ?string $error = null,
        ?bool $isFallback = false
    ): void {
        AiRequest::create([
            'ai_model_id'       => $model->id,
            'user_id'           => auth()->id(),
            'function_name'     => $functionName,
            'prompt_tokens'     => $promptTokens,
            'completion_tokens' => $completionTokens,
            'estimated_cost_usd' => $cost,
            'latency_ms'        => $latencyMs,
            'status'            => $status,
            'error_message'     => $error,
            'fallback_used'     => $isFallback,
        ]);

        $model->provider?->forceFill([
            'last_used_at' => now(),
            'last_used_model' => $model->name,
        ])->save();
    }

    private function defaultBaseUrl(string $slug): string
    {
        return match ($slug) {
            'openai'    => 'https://api.openai.com/v1',
            'anthropic' => 'https://api.anthropic.com/v1',
            'google', 'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
            'openrouter' => 'https://openrouter.ai/api/v1',
            default     => '',
        };
    }

    private function fail(string $error): array
    {
        return ['success' => false, 'content' => null, 'error' => $error, 'tokens' => [], 'cost' => 0, 'model' => ''];
    }

    private function getCachedResult(string $functionName, string $promptContent, array $context, ?int $cacheTtlMinutes): ?array
    {
        if (! $cacheTtlMinutes || $cacheTtlMinutes < 1) {
            return null;
        }

        $cacheKey = $this->cacheKey($functionName, $promptContent, $context);
        $cached = Cache::get($cacheKey);

        if (! is_array($cached)) {
            return null;
        }

        return array_merge($cached, ['is_cached' => true]);
    }

    private function putCachedResult(string $functionName, string $promptContent, array $context, ?int $cacheTtlMinutes, array $result): void
    {
        if (! $cacheTtlMinutes || $cacheTtlMinutes < 1 || ! ($result['success'] ?? false)) {
            return;
        }

        Cache::put(
            $this->cacheKey($functionName, $promptContent, $context),
            [
                'success' => $result['success'],
                'content' => $result['content'],
                'error' => $result['error'] ?? null,
                'tokens' => $result['tokens'] ?? [],
                'cost' => $result['cost'] ?? 0,
                'model' => $result['model'] ?? '',
            ],
            now()->addMinutes($cacheTtlMinutes)
        );
    }

    private function cacheKey(string $functionName, string $promptContent, array $context): string
    {
        $identity = [
            'feature' => $functionName,
            'entity' => $context['entity_id'] ?? $context['lead_id'] ?? $context['conversation_id'] ?? null,
            'entity_type' => $context['entity_type'] ?? null,
            'prompt_hash' => sha1($promptContent),
        ];

        return 'ai:result:' . sha1(json_encode($identity));
    }
}
