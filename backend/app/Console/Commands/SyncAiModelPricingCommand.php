<?php

namespace App\Console\Commands;

use App\Models\AiProvider;
use App\Services\AI\AIConnectionTestService;
use Illuminate\Console\Command;

/**
 * Fills in per-model token prices from each provider's own API.
 *
 * 48 of 50 catalogued models have no prices, so estimateCost() falls back to a guess
 * keyed off cost_tier — $5/$15 per 1M for "high" against deepseek-v4-pro's real
 * $1.32/$3.96. Model discovery already reads pricing when a provider publishes it
 * (OpenRouter-style `pricing.prompt` / `pricing.completion`); nothing applied that to
 * models already in the catalog, only to ones being added.
 *
 * Providers that do not publish pricing — BytePlus among them — are reported so they can
 * be entered by hand instead of quietly staying on a guess.
 */
class SyncAiModelPricingCommand extends Command
{
    protected $signature = 'leadsy:sync-ai-model-pricing
        {--provider= : Limit to one provider slug}
        {--dry-run : Show what would change without writing}
        {--overwrite : Also refresh models that already have prices}';

    protected $description = 'Fetch per-1M-token prices from each AI provider and apply them to catalogued models';

    public function handle(AIConnectionTestService $connectionTests): int
    {
        $providers = AiProvider::with('models')
            ->when($this->option('provider'), fn ($q, $slug) => $q->where('slug', $slug))
            ->where('status', 'active')
            ->get();

        if ($providers->isEmpty()) {
            $this->warn('No active providers matched.');

            return self::SUCCESS;
        }

        $updated = 0;
        $unpriced = [];

        foreach ($providers as $provider) {
            $result = $connectionTests->listModels($provider);

            if (! ($result['supported'] ?? false)) {
                $this->line("{$provider->name}: pricing not available from this provider — ".($result['message'] ?? 'unsupported'));
                foreach ($provider->models as $model) {
                    if (! $model->hasRealPricing()) {
                        $unpriced[] = "{$provider->name} / {$model->name}";
                    }
                }

                continue;
            }

            $priced = collect($result['models'] ?? [])
                ->filter(fn ($m) => ($m['input_price_per_million'] ?? null) !== null && ($m['output_price_per_million'] ?? null) !== null)
                ->keyBy(fn ($m) => (string) ($m['id'] ?? $m['name'] ?? ''));

            foreach ($provider->models as $model) {
                if ($model->hasRealPricing() && ! $this->option('overwrite')) {
                    continue;
                }

                $match = $priced->get($model->name);
                if (! $match) {
                    // Only a model that genuinely has no price is a problem. With
                    // --overwrite a priced model also lands here when the provider
                    // publishes nothing, and reporting that as "no price" would send
                    // someone to re-enter a figure that is already correct.
                    if (! $model->hasRealPricing()) {
                        $unpriced[] = "{$provider->name} / {$model->name}";
                    }

                    continue;
                }

                $this->line(sprintf(
                    '  %s / %-34s in %s -> %s   out %s -> %s',
                    $provider->name,
                    $model->name,
                    $model->cost_per_million_input_tokens ?? '-',
                    $match['input_price_per_million'],
                    $model->cost_per_million_output_tokens ?? '-',
                    $match['output_price_per_million'],
                ));

                if (! $this->option('dry-run')) {
                    $model->update([
                        'cost_per_million_input_tokens' => $match['input_price_per_million'],
                        'cost_per_million_output_tokens' => $match['output_price_per_million'],
                        'pricing_source' => 'openrouter_api',
                        'pricing_synced_at' => now(),
                    ]);
                }

                $updated++;
            }
        }

        $this->newLine();
        $this->info(($this->option('dry-run') ? 'Would update ' : 'Updated ').$updated.' model(s).');

        if ($unpriced !== []) {
            $this->newLine();
            $this->warn(count($unpriced).' model(s) still have no price, so their cost is a tier guess. Enter these by hand in Settings → AI Defaults → Providers:');
            foreach (array_slice($unpriced, 0, 20) as $name) {
                $this->line("  - {$name}");
            }
            if (count($unpriced) > 20) {
                $this->line('  … and '.(count($unpriced) - 20).' more.');
            }
        }

        return self::SUCCESS;
    }
}
