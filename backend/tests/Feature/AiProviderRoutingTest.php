<?php

namespace Tests\Feature;

use App\Models\AiFeatureRoute;
use App\Models\AiModel;
use App\Models\AiProvider;
use App\Services\AI\AIPriorityResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

/**
 * Which provider answers an AI feature is configuration, never code.
 *
 * Before 2026-09-26 a feature's own route rows REPLACED the global chain — global was
 * consulted only when a feature had none. Seeders created those rows and pinned them to a
 * model by name (gemini-1.5-flash, gemini-1.5-pro, "first active model"), so several
 * features silently ignored Global AI Routing entirely and could not fall back at all.
 */
class AiProviderRoutingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Migrations seed a provider catalog, so these must not assume an empty table.
     * Everything is forced into a known, usable state instead of created blindly.
     */
    private function provider(string $slug): AiProvider
    {
        $provider = AiProvider::firstOrNew(['slug' => $slug]);
        $provider->fill([
            'name' => ucfirst($slug),
            'provider_type' => $slug,
            'base_url' => "https://{$slug}.test/v1",
            'api_key_encrypted' => Crypt::encryptString('test-key-not-a-real-credential'),
            'status' => 'active',
        ])->save();

        return $provider->refresh();
    }

    private function model(AiProvider $provider, string $name): AiModel
    {
        $model = AiModel::firstOrNew(['ai_provider_id' => $provider->id, 'name' => $name]);
        $model->fill(['status' => 'active'])->save();

        return $model->refresh();
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Migrations ship a provider/model catalog; the chain under test must be the
        // only one, so start from an empty routing table and catalog.
        AiFeatureRoute::query()->delete();
        AiModel::query()->delete();
        AiProvider::query()->delete();
    }

    private function route(string $feature, AiModel $model, int $priority): AiFeatureRoute
    {
        return AiFeatureRoute::create([
            'feature_name' => $feature,
            'ai_model_id' => $model->id,
            'priority' => $priority,
            'is_active' => true,
        ]);
    }

    public function test_a_feature_with_no_route_of_its_own_follows_the_global_chain(): void
    {
        $byteplus = $this->model($this->provider('byteplus'), 'deepseek-v4-pro');
        $this->route('global', $byteplus, 1);

        $chain = app(AIPriorityResolverService::class)->getRoutesForFeature('lead_ai_profiling');

        $this->assertCount(1, $chain);
        $this->assertSame('deepseek-v4-pro', $chain->first()->aiModel->name);
    }

    public function test_the_global_chain_is_always_reachable_even_when_a_feature_is_pinned(): void
    {
        $gemini = $this->model($this->provider('gemini'), 'gemini-1.5-flash');
        $byteplus = $this->provider('byteplus');
        $pro = $this->model($byteplus, 'deepseek-v4-pro');
        $flash = $this->model($byteplus, 'deepseek-v4-flash');

        // A leftover pin, of the kind the seeders used to create.
        $this->route('lead_ai_profiling', $gemini, 1);
        $this->route('global', $pro, 1);
        $this->route('global', $flash, 2);

        $chain = app(AIPriorityResolverService::class)->getRoutesForFeature('lead_ai_profiling');

        $this->assertSame(
            ['gemini-1.5-flash', 'deepseek-v4-pro', 'deepseek-v4-flash'],
            $chain->map(fn ($r) => $r->aiModel->name)->all(),
            'A pinned feature must still be able to fall through to every globally configured provider.'
        );
    }

    public function test_global_priority_order_is_respected(): void
    {
        $byteplus = $this->provider('byteplus');
        $this->route('global', $this->model($byteplus, 'deepseek-v4-flash'), 2);
        $this->route('global', $this->model($byteplus, 'deepseek-v4-pro'), 1);

        $chain = app(AIPriorityResolverService::class)->getRoutesForFeature('pre_meeting_brief');

        $this->assertSame(
            ['deepseek-v4-pro', 'deepseek-v4-flash'],
            $chain->map(fn ($r) => $r->aiModel->name)->all()
        );
    }

    public function test_a_model_is_not_tried_twice_when_it_appears_in_both_chains(): void
    {
        $model = $this->model($this->provider('byteplus'), 'deepseek-v4-pro');
        $this->route('lead_ai_profiling', $model, 1);
        $this->route('global', $model, 1);

        $chain = app(AIPriorityResolverService::class)->getRoutesForFeature('lead_ai_profiling');

        $this->assertCount(1, $chain);
    }

    public function test_a_provider_without_a_usable_key_is_skipped(): void
    {
        $unconfigured = AiProvider::create([
            'name' => 'Unconfigured',
            'slug' => 'unconfigured',
            'provider_type' => 'openai',
            'base_url' => 'https://unconfigured.test/v1',
            'api_key_encrypted' => Crypt::encryptString('PLACEHOLDER'),
            'status' => 'active',
        ]);
        $this->route('global', $this->model($unconfigured, 'ghost-model'), 1);

        $working = $this->model($this->provider('byteplus'), 'deepseek-v4-pro');
        $this->route('global', $working, 2);

        $chain = app(AIPriorityResolverService::class)->getRoutesForFeature('lead_scoring');

        $this->assertSame(['deepseek-v4-pro'], $chain->map(fn ($r) => $r->aiModel->name)->all());
    }

    public function test_no_seeder_pins_a_feature_to_a_named_model(): void
    {
        $offenders = [];

        foreach (glob(database_path('seeders/*.php')) as $file) {
            $body = file_get_contents($file);

            if (preg_match("/AiModel::where\(\s*'name'/", $body)) {
                $offenders[] = basename($file).': selects a model by name';
            }
            if (str_contains($body, 'AiFeatureRoute::updateOrCreate') || str_contains($body, 'AiFeatureRoute::create')) {
                $offenders[] = basename($file).': creates a provider route';
            }
        }

        $this->assertSame([], $offenders, 'Provider choice belongs to Feature Routing in AI Defaults, not to a seeder.');
    }
}
