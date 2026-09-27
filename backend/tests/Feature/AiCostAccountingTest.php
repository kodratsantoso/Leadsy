<?php

namespace Tests\Feature;

use App\Models\AiModel;
use App\Models\AiProvider;
use App\Models\AiRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

/**
 * What the AI actually costs has to be answerable, and a guess must never be presented
 * as a measurement.
 *
 * estimateCost() falls back to a coarse cost_tier guess when a model has no per-1M-token
 * prices — $5/$15 for "high" against deepseek-v4-pro's real $1.32/$3.96, nearly 4x out.
 * 48 of 50 models have no prices, and until now both numbers were stored and displayed
 * the same way.
 */
class AiCostAccountingTest extends TestCase
{
    use RefreshDatabase;

    private function model(?float $in, ?float $out, string $tier = 'high'): AiModel
    {
        $provider = AiProvider::create([
            'name' => 'Test', 'slug' => 'test-'.uniqid(), 'provider_type' => 'openai',
            'base_url' => 'https://test.invalid/v1',
            'api_key_encrypted' => Crypt::encryptString('test-key'), 'status' => 'active',
        ]);

        return AiModel::create([
            'ai_provider_id' => $provider->id,
            'name' => 'test-model-'.uniqid(),
            'status' => 'active',
            'cost_tier' => $tier,
            'cost_per_million_input_tokens' => $in,
            'cost_per_million_output_tokens' => $out,
        ]);
    }

    private function estimate(AiModel $model, int $in, int $out): array
    {
        $svc = app(\App\Services\AI\AiOrchestrationService::class);
        $ref = new \ReflectionMethod($svc, 'estimateCost');
        $ref->setAccessible(true);

        return $ref->invoke($svc, $model, $in, $out);
    }

    public function test_a_model_with_prices_produces_a_measured_cost(): void
    {
        $model = $this->model(1.32, 3.96);

        $result = $this->estimate($model, 1_000_000, 1_000_000);

        $this->assertSame('measured', $result['basis']);
        $this->assertEqualsWithDelta(1.32 + 3.96, $result['cost'], 0.0001);
    }

    public function test_a_model_without_prices_is_labelled_estimated(): void
    {
        $model = $this->model(null, null, 'high');

        $result = $this->estimate($model, 1_000_000, 1_000_000);

        $this->assertSame('estimated', $result['basis'], 'A tier guess must never be recorded as measured.');
        $this->assertEqualsWithDelta(5.00 + 15.00, $result['cost'], 0.0001);
    }

    public function test_half_configured_pricing_is_not_treated_as_measured(): void
    {
        // hasRealPricing() needs both sides; one alone would silently halve the cost.
        $this->assertSame('estimated', $this->estimate($this->model(1.32, null), 1_000_000, 0)['basis']);
        $this->assertSame('estimated', $this->estimate($this->model(null, 3.96), 0, 1_000_000)['basis']);
    }

    public function test_the_basis_is_persisted_so_reports_can_separate_the_two(): void
    {
        $model = $this->model(1.32, 3.96);

        AiRequest::create([
            'ai_model_id' => $model->id,
            'function_name' => 'lead_analysis',
            'prompt_tokens' => 1000,
            'completion_tokens' => 500,
            'estimated_cost_usd' => 0.00330,
            'pricing_basis' => 'measured',
            'status' => 'success',
        ]);

        $this->assertSame('measured', AiRequest::first()->pricing_basis);
    }

    /* ── Phase B: the rupiah conversion must be frozen when the call runs ── */

    private function currencies(string $activeCode, float $idrPerUsd = 17543.8596): void
    {
        \App\Models\Currency::updateOrCreate(['code' => 'IDR'], ['name' => 'Rupiah', 'symbol' => 'Rp', 'exchange_rate' => 1.0]);
        \App\Models\Currency::updateOrCreate(['code' => 'USD'], ['name' => 'US Dollar', 'symbol' => '$', 'exchange_rate' => $idrPerUsd]);

        $active = \App\Models\Currency::where('code', $activeCode)->firstOrFail();
        \App\Models\CurrencySetting::truncate();
        \App\Models\CurrencySetting::create(['currency_id' => $active->id]);
    }

    private function snapshot(float $costUsd): array
    {
        $svc = app(\App\Services\AI\AiOrchestrationService::class);
        $ref = new \ReflectionMethod($svc, 'snapshotCurrencyConversion');
        $ref->setAccessible(true);

        return $ref->invoke($svc, $costUsd);
    }

    public function test_the_rupiah_amount_is_computed_from_todays_rate_at_call_time(): void
    {
        $this->currencies('IDR');

        $snap = $this->snapshot(1.0);

        $this->assertSame('IDR', $snap['code']);
        $this->assertEqualsWithDelta(17543.8596, $snap['rate'], 0.01);
        $this->assertEqualsWithDelta(17543.8596, $snap['converted'], 0.01);
    }

    public function test_a_later_rate_change_does_not_move_an_already_recorded_cost(): void
    {
        // The whole point of freezing it: a historical report must not drift when the
        // rate moves. All 329 rows in the live database have a null snapshot, so today
        // the rupiah figure is recomputed at report time with whatever rate is current.
        $this->currencies('IDR', 17543.8596);
        $atCallTime = $this->snapshot(2.0);

        $model = $this->model(1.32, 3.96);
        AiRequest::create([
            'ai_model_id' => $model->id,
            'function_name' => 'lead_analysis',
            'prompt_tokens' => 1000,
            'completion_tokens' => 500,
            'estimated_cost_usd' => 2.0,
            'pricing_basis' => 'measured',
            'cost_currency_code' => $atCallTime['code'],
            'cost_converted' => $atCallTime['converted'],
            'exchange_rate_snapshot' => $atCallTime['rate'],
            'status' => 'success',
        ]);

        // The rupiah weakens sharply afterwards.
        $this->currencies('IDR', 20000.0);

        $row = AiRequest::first();
        $this->assertEqualsWithDelta(35087.7192, (float) $row->cost_converted, 0.05);
        $this->assertEqualsWithDelta(17543.8596, (float) $row->exchange_rate_snapshot, 0.01);
        $this->assertSame('IDR', $row->cost_currency_code);
    }

    public function test_no_conversion_is_invented_when_the_active_currency_is_usd(): void
    {
        $this->currencies('USD');

        $snap = $this->snapshot(1.5);

        $this->assertSame('USD', $snap['code']);
        $this->assertSame(1.0, $snap['rate']);
        $this->assertSame(1.5, $snap['converted']);
    }
}
