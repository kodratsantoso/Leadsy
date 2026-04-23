<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiModel;
use App\Models\AiPromptTemplateVersion;
use App\Models\AiProvider;
use App\Services\AI\AIConnectionTestService;
use App\Services\AI\AIPromptTemplateService;
use App\Services\AI\AIProviderService;
use App\Services\AI\AIRoutingService;
use App\Services\AI\AIUsageLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSettingsController extends Controller
{
    public function __construct(
        private AIProviderService $providers,
        private AIRoutingService $routing,
        private AIPromptTemplateService $prompts,
        private AIConnectionTestService $connectionTests,
        private AIUsageLogService $usage,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $canReveal = $this->canRevealSecrets($request);

        return response()->json([
            'data' => [
                'providers' => $this->providers->listProviders()
                    ->map(fn (AiProvider $provider) => $this->providers->serialiseProvider($provider, $canReveal))
                    ->values(),
                'feature_catalog' => $this->routing->featureCatalog(),
                'feature_routes' => $this->groupRoutes($this->routing->listRoutes()),
                'prompt_templates' => $this->serialiseTemplates(),
                'usage_overview' => $this->usage->usageOverview(),
                'provider_health' => $this->usage->providersHealth(),
                'permissions' => [
                    'can_manage_ai' => true,
                    'can_reveal_secrets' => $canReveal,
                ],
            ],
        ]);
    }

    public function storeProvider(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|unique:ai_providers,slug',
            'provider_type' => 'nullable|string|max:100',
            'base_url' => 'nullable|url',
            'api_key' => 'required|string',
            'organization_id' => 'nullable|string|max:255',
            'project_id' => 'nullable|string|max:255',
            'default_model' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
            'timeout_seconds' => 'nullable|integer|min:1|max:300',
            'retry_limit' => 'nullable|integer|min:0|max:10',
            'max_tokens_default' => 'nullable|integer|min:1',
            'cache_ttl_minutes' => 'nullable|integer|min:1',
            'cost_sensitivity' => 'nullable|string|max:100',
        ]);

        $provider = $this->providers->createProvider($data);

        return response()->json([
            'data' => $this->providers->serialiseProvider($provider, $this->canRevealSecrets($request)),
        ], 201);
    }

    public function updateProvider(Request $request, AiProvider $aiProvider): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'provider_type' => 'nullable|string|max:100',
            'base_url' => 'nullable|url',
            'api_key' => 'nullable|string',
            'organization_id' => 'nullable|string|max:255',
            'project_id' => 'nullable|string|max:255',
            'default_model' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
            'timeout_seconds' => 'nullable|integer|min:1|max:300',
            'retry_limit' => 'nullable|integer|min:0|max:10',
            'max_tokens_default' => 'nullable|integer|min:1',
            'cache_ttl_minutes' => 'nullable|integer|min:1',
            'cost_sensitivity' => 'nullable|string|max:100',
        ]);

        $provider = $this->providers->updateProvider($aiProvider, $data);

        return response()->json([
            'data' => $this->providers->serialiseProvider($provider, $this->canRevealSecrets($request)),
        ]);
    }

    public function destroyProvider(AiProvider $aiProvider): JsonResponse
    {
        $this->providers->deleteProvider($aiProvider);

        return response()->json(null, 204);
    }

    public function testProvider(AiProvider $aiProvider): JsonResponse
    {
        return response()->json($this->connectionTests->test($aiProvider));
    }

    public function revealKey(Request $request, AiProvider $aiProvider): JsonResponse
    {
        abort_unless($this->canRevealSecrets($request), 403, 'Only admin roles can reveal API keys.');

        return response()->json([
            'data' => [
                'provider_id' => $aiProvider->id,
                'api_key' => $this->providers->revealKey($aiProvider),
            ],
        ]);
    }

    public function auditCopyKey(Request $request, AiProvider $aiProvider): JsonResponse
    {
        abort_unless($this->canRevealSecrets($request), 403, 'Only admin roles can copy API keys.');

        $this->providers->logCopyAction($aiProvider);

        return response()->json(['success' => true]);
    }

    public function storeModel(Request $request, AiProvider $aiProvider): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'context_window' => 'nullable|integer|min:1',
            'capabilities' => 'nullable|array',
            'cost_tier' => 'nullable|in:low,medium,high',
            'default_usage_type' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,deprecated',
        ]);

        $model = $this->providers->addModel($aiProvider, $data);

        return response()->json(['data' => $model], 201);
    }

    public function destroyModel(AiProvider $aiProvider, AiModel $model): JsonResponse
    {
        abort_if($model->ai_provider_id !== $aiProvider->id, 404);
        $this->providers->deleteModel($aiProvider, $model);

        return response()->json(null, 204);
    }

    public function saveFeatureRoutes(Request $request, string $featureName): JsonResponse
    {
        $data = $request->validate([
            'routes' => 'required|array|min:1|max:4',
            'routes.*.ai_model_id' => 'required|exists:ai_models,id',
            'routes.*.priority' => 'required|integer|min:1|max:4',
            'routes.*.max_retries' => 'nullable|integer|min:0|max:10',
            'routes.*.timeout_seconds' => 'nullable|integer|min:1|max:300',
            'routes.*.cache_ttl_minutes' => 'nullable|integer|min:1',
            'routes.*.max_tokens' => 'nullable|integer|min:1',
            'routes.*.complexity_mode' => 'nullable|string|max:100',
            'routes.*.cost_sensitivity' => 'nullable|string|max:100',
            'routes.*.is_active' => 'nullable|boolean',
        ]);

        $routes = $this->routing->saveFeatureRoutes($featureName, $data['routes']);

        return response()->json(['data' => $this->groupRoutes($routes)]);
    }

    public function promptTemplates(): JsonResponse
    {
        return response()->json(['data' => $this->serialiseTemplates()]);
    }

    public function createPromptVersion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feature_name' => 'required|string|max:255',
            'template_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'content' => 'required|string',
        ]);

        $version = $this->prompts->createVersion($data, $request->user()?->id);

        return response()->json(['data' => $this->serialiseVersion($version)], 201);
    }

    public function activatePromptVersion(Request $request, AiPromptTemplateVersion $version): JsonResponse
    {
        $activated = $this->prompts->activateVersion($version, $request->user()?->id);

        return response()->json(['data' => $this->serialiseVersion($activated)]);
    }

    public function previewPrompt(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feature_name' => 'required|string|max:255',
            'sample_input' => 'required|string',
            'content' => 'nullable|string',
        ]);

        return response()->json([
            'data' => [
                'compiled_prompt' => $this->prompts->previewPrompt(
                    $data['feature_name'],
                    $data['sample_input'],
                    $data['content'] ?? null
                ),
            ],
        ]);
    }

    protected function serialiseTemplates(): array
    {
        return $this->prompts->listTemplates()
            ->map(fn ($template) => [
                'id' => $template->id,
                'feature_name' => $template->feature_name,
                'template_name' => $template->template_name,
                'description' => $template->description,
                'is_active' => $template->is_active,
                'active_version_id' => $template->active_version_id,
                'active_version' => $template->activeVersion ? $this->serialiseVersion($template->activeVersion) : null,
                'versions' => $template->versions->map(fn ($version) => $this->serialiseVersion($version))->values(),
            ])
            ->values()
            ->all();
    }

    protected function serialiseVersion(AiPromptTemplateVersion $version): array
    {
        return [
            'id' => $version->id,
            'ai_prompt_template_id' => $version->ai_prompt_template_id,
            'feature_name' => $version->template?->feature_name,
            'template_name' => $version->template?->template_name,
            'version' => $version->version,
            'content' => $version->content,
            'is_active' => $version->is_active,
            'is_enabled' => $version->is_enabled,
            'created_at' => optional($version->created_at)->toIso8601String(),
            'activated_at' => optional($version->activated_at)->toIso8601String(),
        ];
    }

    protected function groupRoutes($routes): array
    {
        return collect($routes)
            ->groupBy('feature_name')
            ->map(fn ($featureRoutes, $featureName) => [
                'feature_name' => $featureName,
                'feature_label' => AIRoutingService::FEATURE_CATALOG[$featureName] ?? $featureName,
                'routes' => collect($featureRoutes)->sortBy('priority')->map(fn ($route) => [
                    'id' => $route->id,
                    'feature_name' => $route->feature_name,
                    'priority' => $route->priority,
                    'ai_model_id' => $route->ai_model_id,
                    'model_name' => $route->aiModel?->name,
                    'provider_id' => $route->aiModel?->provider?->id,
                    'provider_name' => $route->aiModel?->provider?->name,
                    'timeout_seconds' => $route->timeout_seconds,
                    'max_retries' => $route->max_retries,
                    'cache_ttl_minutes' => $route->cache_ttl_minutes,
                    'max_tokens' => $route->max_tokens,
                    'complexity_mode' => $route->complexity_mode,
                    'cost_sensitivity' => $route->cost_sensitivity,
                    'is_active' => $route->is_active,
                ])->values(),
            ])
            ->values()
            ->all();
    }

    protected function canRevealSecrets(Request $request): bool
    {
        $user = $request->user();

        return (bool) $user && ($user->isSuperAdmin() || $user->hasRole('admin'));
    }
}
