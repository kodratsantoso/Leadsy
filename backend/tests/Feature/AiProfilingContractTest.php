<?php

namespace Tests\Feature;

use App\Services\AI\AIPromptTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The profiler can only return what it is asked for.
 *
 * Its screen renders 38 fields while the active contract listed 14, and the contract was
 * dropped before reaching the model anyway — so the prompt said "conform strictly to the
 * contract" while showing none. Industry, sub-industry, company size, business type and
 * the business-intelligence fields all went missing for those two reasons.
 */
class AiProfilingContractTest extends TestCase
{
    use RefreshDatabase;

    private function compiled(): string|array
    {
        return app(AIPromptTemplateService::class)->compilePrompt('lead_ai_profiling', '', [
            'company_name' => 'PT Axindo Humaper',
            'available_industries' => 'Manufacturing, Mining',
            'available_sub_industries' => 'Coal Mining',
            'available_business_categories' => 'B2B, Distributor',
        ]);
    }

    public function test_the_contract_covers_every_field_the_panel_renders(): void
    {
        $version = app(AIPromptTemplateService::class)->getActiveVersionForFeature('lead_ai_profiling');
        $contract = $version?->output_contract_json ?? [];

        foreach ([
            'industry', 'sub_industry', 'business_category', 'company_size',
            'business_model', 'primary_sector', 'vertical', 'target_market',
            'presales_perspective', 'customer_story', 'legal_name', 'year_established',
            'ownership_type', 'company_size_estimate',
        ] as $field) {
            $this->assertArrayHasKey($field, $contract, "The profiler screen shows {$field}, so the model must be asked for it.");
        }
    }

    public function test_the_contract_is_actually_sent_to_the_model(): void
    {
        $svc = app(\App\Services\AI\AiOrchestrationService::class);
        $build = new \ReflectionMethod($svc, 'buildRequestBody');
        $build->setAccessible(true);

        $body = $build->invoke($svc, 'openai', 'test-model', $this->compiled(), 4096, []);
        $sent = json_encode($body);

        $this->assertStringContainsString('business_model', $sent, 'The output contract must reach the model.');
        $this->assertStringContainsString('sub_industry', $sent);
        $this->assertStringContainsString('presales_perspective', $sent);
    }

    public function test_the_company_name_and_master_lists_are_substituted(): void
    {
        $sent = json_encode($this->compiled());

        $this->assertStringContainsString('PT Axindo Humaper', $sent);
        $this->assertStringContainsString('Coal Mining', $sent);
        $this->assertStringNotContainsString('{{company_name}}', $sent, 'An unsubstituted placeholder means the model never learns which company to research.');
    }
}
