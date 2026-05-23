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
            'openrouter' => 'https://openrouter.ai/api/v1',
            default => '',
        };
    }
}
