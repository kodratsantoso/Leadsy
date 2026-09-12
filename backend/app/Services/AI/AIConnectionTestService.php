<?php

namespace App\Services\AI;

use App\Models\AiConnectionTest;
use App\Models\AiProvider;
use App\Services\AuditService;

class AIConnectionTestService
{
    public function test(AiProvider $provider): array
    {
        $start = microtime(true);
        $success = false;
        $status = null;
        $message = null;
        $responseMetadata = [];

        try {
            $url = $this->testEndpoint($provider);
            $headers = $this->headers($provider);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => $provider->timeout_seconds ?? 10,
                CURLOPT_HTTPHEADER => $headers,
            ]);

            $responseBody = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
            $curlError = curl_error($ch);
            curl_close($ch);

            $success = $status >= 200 && $status < 300 && empty($curlError);
            $message = $success ? 'Connection successful' : ($curlError ?: ('HTTP '.$status));
            $responseMetadata = [
                'endpoint' => $url,
                'body_preview' => is_string($responseBody) ? mb_substr($responseBody, 0, 500) : null,
            ];
        } catch (\Throwable $e) {
            $message = $e->getMessage();
        }

        $latencyMs = (int) round((microtime(true) - $start) * 1000);

        $test = AiConnectionTest::create([
            'ai_provider_id' => $provider->id,
            'tested_by' => auth()->id(),
            'success' => $success,
            'http_status' => $status,
            'latency_ms' => $latencyMs,
            'message' => $message,
            'response_metadata' => $responseMetadata,
        ]);

        $provider->forceFill([
            'last_tested_at' => now(),
            'last_test_status' => $success ? 'success' : 'failed',
            'last_test_message' => $message,
        ])->save();

        AuditService::log(
            'connection_tested',
            'ai_providers',
            $provider,
            null,
            ['success' => $success, 'http_status' => $status, 'latency_ms' => $latencyMs],
        );

        return [
            'success' => $success,
            'status' => $status,
            'latency_ms' => $latencyMs,
            'message' => $message,
            'test_id' => $test->id,
        ];
    }

    /**
     * Fetch the list of models actually available to this provider's API key,
     * so the admin can pick from a dropdown instead of typing model names by
     * hand. Not every provider exposes a reliable, unauthenticated-shape
     * list-models endpoint (notably Anthropic historically didn't) — callers
     * should treat `supported: false` as "fall back to manual entry", not
     * an error.
     *
     * @return array{supported: bool, models: array<int, array{id: string, name: string, input_price_per_million: float|null, output_price_per_million: float|null}>, message: ?string}
     */
    public function listModels(AiProvider $provider): array
    {
        $type = $provider->provider_type ?: $provider->slug;
        $baseUrl = rtrim($provider->base_url ?: $this->defaultBaseUrl($type), '/');
        $key = $provider->decrypted_api_key ?? '';

        if (empty($key)) {
            return ['supported' => false, 'models' => [], 'message' => 'Configure an API key first.'];
        }

        $url = match ($type) {
            'gemini', 'google' => $baseUrl.'/models?key='.urlencode($key),
            default => $baseUrl.'/models',
        };

        try {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => $provider->timeout_seconds ?? 15,
                CURLOPT_HTTPHEADER => $this->headers($provider),
            ]);
            $body = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: null;
            curl_close($ch);

            if ($status < 200 || $status >= 300 || ! is_string($body)) {
                return ['supported' => false, 'models' => [], 'message' => "Provider returned HTTP {$status} for {$url}."];
            }

            $decoded = json_decode($body, true);
            if (! is_array($decoded)) {
                return ['supported' => false, 'models' => [], 'message' => 'Provider response was not valid JSON.'];
            }

            return ['supported' => true, 'models' => $this->normalizeModelList($type, $decoded), 'message' => null];
        } catch (\Throwable $e) {
            return ['supported' => false, 'models' => [], 'message' => $e->getMessage()];
        }
    }

    private function normalizeModelList(string $providerType, array $decoded): array
    {
        return match ($providerType) {
            'gemini', 'google' => collect($decoded['models'] ?? [])
                ->map(fn ($m) => [
                    'id' => str_replace('models/', '', $m['name'] ?? ''),
                    'name' => $m['displayName'] ?? str_replace('models/', '', $m['name'] ?? ''),
                    'input_price_per_million' => null,
                    'output_price_per_million' => null,
                ])
                ->filter(fn ($m) => $m['id'] !== '')
                ->values()->all(),

            'openrouter' => collect($decoded['data'] ?? [])
                ->map(fn ($m) => [
                    'id' => $m['id'] ?? null,
                    'name' => $m['name'] ?? ($m['id'] ?? ''),
                    // OpenRouter reports USD cost per single token as a numeric string.
                    'input_price_per_million' => isset($m['pricing']['prompt']) ? round(((float) $m['pricing']['prompt']) * 1_000_000, 6) : null,
                    'output_price_per_million' => isset($m['pricing']['completion']) ? round(((float) $m['pricing']['completion']) * 1_000_000, 6) : null,
                ])
                ->filter(fn ($m) => !empty($m['id']))
                ->values()->all(),

            // OpenAI-compatible shape ({data:[{id:"..."}]}) — used by openai,
            // byteplus, and any custom provider that follows the same convention.
            // Anthropic's models endpoint (when available) also returns this shape.
            default => collect($decoded['data'] ?? [])
                ->map(fn ($m) => [
                    'id' => $m['id'] ?? null,
                    'name' => $m['display_name'] ?? ($m['id'] ?? ''),
                    'input_price_per_million' => null,
                    'output_price_per_million' => null,
                ])
                ->filter(fn ($m) => !empty($m['id']))
                ->values()->all(),
        };
    }

    protected function testEndpoint(AiProvider $provider): string
    {
        $baseUrl = rtrim($provider->base_url ?: $this->defaultBaseUrl($provider->provider_type ?: $provider->slug), '/');

        return match ($provider->provider_type ?: $provider->slug) {
            'anthropic' => $baseUrl.'/messages',
            'gemini', 'google' => $baseUrl.'/models',
            default => $baseUrl.'/models',
        };
    }

    protected function headers(AiProvider $provider): array
    {
        $key = $provider->decrypted_api_key ?? '';
        $common = ['Accept: application/json', 'Content-Type: application/json'];

        return match ($provider->provider_type ?: $provider->slug) {
            'anthropic' => array_merge($common, [
                'x-api-key: '.$key,
                'anthropic-version: 2023-06-01',
            ]),
            'gemini', 'google' => array_merge($common, ['x-goog-api-key: '.$key]),
            default => array_merge($common, ['Authorization: Bearer '.$key]),
        };
    }

    protected function defaultBaseUrl(string $providerType): string
    {
        return match ($providerType) {
            'openai' => 'https://api.openai.com/v1',
            'anthropic' => 'https://api.anthropic.com/v1',
            'gemini', 'google' => 'https://generativelanguage.googleapis.com/v1beta',
            'byteplus' => 'https://ark.ap-southeast.bytepluses.com/api/v3',
            'openrouter' => 'https://openrouter.ai/api/v1',
            default => '',
        };
    }
}
