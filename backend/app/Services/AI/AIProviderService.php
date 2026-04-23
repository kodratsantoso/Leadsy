<?php

namespace App\Services\AI;

use App\Models\AiModel;
use App\Models\AiProvider;
use App\Services\AuditService;
use Illuminate\Support\Collection;

class AIProviderService
{
    public function listProviders(): Collection
    {
        return AiProvider::with(['models' => fn ($query) => $query->orderBy('name'), 'connectionTests' => fn ($query) => $query->latest()])
            ->orderBy('name')
            ->get();
    }

    public function createProvider(array $data): AiProvider
    {
        $payload = $this->normaliseProviderPayload($data);
        $payload['api_key_encrypted'] = $data['api_key'];

        $provider = AiProvider::create($payload);

        AuditService::logCreated('ai_providers', $provider);

        return $provider->fresh(['models', 'connectionTests']);
    }

    public function updateProvider(AiProvider $provider, array $data): AiProvider
    {
        $original = $provider->getAttributes();
        $payload = $this->normaliseProviderPayload($data, $provider);

        if (! empty($data['api_key'])) {
            $payload['api_key_encrypted'] = $data['api_key'];
        }

        $provider->update($payload);

        AuditService::logUpdated('ai_providers', $provider, $original);

        return $provider->fresh(['models', 'connectionTests']);
    }

    public function deleteProvider(AiProvider $provider): void
    {
        AuditService::logDeleted('ai_providers', $provider);
        $provider->delete();
    }

    public function addModel(AiProvider $provider, array $data): AiModel
    {
        $model = $provider->models()->create($data);
        AuditService::logCreated('ai_models', $model);

        if (! $provider->default_model) {
            $provider->forceFill(['default_model' => $model->name])->save();
        }

        return $model;
    }

    public function deleteModel(AiProvider $provider, AiModel $model): void
    {
        AuditService::logDeleted('ai_models', $model);
        $model->delete();

        if ($provider->default_model === $model->name) {
            $provider->forceFill([
                'default_model' => $provider->models()->orderBy('name')->value('name'),
            ])->save();
        }
    }

    public function serialiseProvider(AiProvider $provider, bool $canReveal = false): array
    {
        $lastTest = $provider->connectionTests->first();

        return [
            'id' => $provider->id,
            'name' => $provider->name,
            'slug' => $provider->slug,
            'provider_type' => $provider->provider_type,
            'base_url' => $provider->base_url,
            'organization_id' => $provider->organization_id,
            'project_id' => $provider->project_id,
            'default_model' => $provider->default_model,
            'status' => $provider->status,
            'enabled' => $provider->status === 'active',
            'priority_summary' => $provider->models->map(fn ($model) => $model->featureRoutes()->pluck('priority'))->flatten()->unique()->values(),
            'last_tested_at' => optional($provider->last_tested_at)->toIso8601String(),
            'last_test_status' => $provider->last_test_status,
            'last_test_message' => $provider->last_test_message,
            'last_test_http_status' => $lastTest?->http_status,
            'last_used_at' => optional($provider->last_used_at)->toIso8601String(),
            'last_used_model' => $provider->last_used_model,
            'api_key_masked' => $provider->maskApiKey(),
            'api_key_visibility_mode' => $canReveal ? 'masked_with_reveal' : 'masked_only',
            'can_reveal_key' => $canReveal,
            'has_key' => $provider->hasConfiguredKey(),
            'timeout_seconds' => $provider->timeout_seconds,
            'retry_limit' => $provider->retry_limit,
            'max_tokens_default' => $provider->max_tokens_default,
            'cache_ttl_minutes' => $provider->cache_ttl_minutes,
            'cost_sensitivity' => $provider->cost_sensitivity,
            'models' => $provider->models->map(fn (AiModel $model) => [
                'id' => $model->id,
                'name' => $model->name,
                'context_window' => $model->context_window,
                'capabilities' => $model->capabilities,
                'cost_tier' => $model->cost_tier,
                'status' => $model->status,
            ])->values(),
        ];
    }

    public function revealKey(AiProvider $provider): string
    {
        AuditService::log(
            'api_key_revealed',
            'ai_providers',
            $provider,
            null,
            ['provider_id' => $provider->id, 'provider' => $provider->slug]
        );

        return $provider->decrypted_api_key ?? '';
    }

    public function logCopyAction(AiProvider $provider): void
    {
        AuditService::log(
            'api_key_copied',
            'ai_providers',
            $provider,
            null,
            ['provider_id' => $provider->id, 'provider' => $provider->slug]
        );
    }

    protected function normaliseProviderPayload(array $data, ?AiProvider $provider = null): array
    {
        $slug = $data['slug'] ?? $provider?->slug ?? 'custom';

        return [
            'name' => $data['name'] ?? $provider?->name,
            'slug' => $slug,
            'provider_type' => $data['provider_type'] ?? $this->inferProviderType($slug),
            'base_url' => $data['base_url'] ?? $provider?->base_url ?? $this->defaultUrl($slug),
            'organization_id' => $data['organization_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'default_model' => $data['default_model'] ?? $provider?->default_model,
            'region' => $data['region'] ?? null,
            'status' => $data['status'] ?? 'inactive',
            'environments' => $data['environments'] ?? $provider?->environments,
            'timeout_seconds' => $data['timeout_seconds'] ?? $provider?->timeout_seconds ?? 30,
            'retry_limit' => $data['retry_limit'] ?? $provider?->retry_limit ?? 1,
            'max_tokens_default' => $data['max_tokens_default'] ?? $provider?->max_tokens_default,
            'cache_ttl_minutes' => $data['cache_ttl_minutes'] ?? $provider?->cache_ttl_minutes,
            'cost_sensitivity' => $data['cost_sensitivity'] ?? $provider?->cost_sensitivity ?? 'balanced',
        ];
    }

    protected function inferProviderType(string $slug): string
    {
        return match ($slug) {
            'openai' => 'openai',
            'anthropic' => 'anthropic',
            'google', 'gemini' => 'gemini',
            'openrouter' => 'openrouter',
            default => 'custom',
        };
    }

    protected function defaultUrl(string $slug): ?string
    {
        return match ($slug) {
            'openai' => 'https://api.openai.com/v1',
            'anthropic' => 'https://api.anthropic.com/v1',
            'google', 'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
            'openrouter' => 'https://openrouter.ai/api/v1',
            default => null,
        };
    }
}
