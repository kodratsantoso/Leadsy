<?php

namespace Tests\Feature;

use App\Models\AiPromptTemplate;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every AI feature must have a prompt an operator can edit, and adding one must never
 * change what the model receives until somebody actually edits it.
 *
 * The second half is what used to make this impossible. A template without `{{input}}`
 * replaced the prompt the service had built, so `lead_enrichment` shipped literal
 * "{{company_name}}" to the model. That single behaviour is why 21 of 24 features could
 * not safely be given a template.
 */
class AiPromptTemplateCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Migrations seed 34 default templates; these tests build the exact template
        // under test, so start from none.
        \App\Models\AiPromptTemplateVersion::query()->delete();
        AiPromptTemplate::query()->delete();
    }

    private function template(string $feature, string $content): void
    {
        $t = AiPromptTemplate::create([
            'feature_name' => $feature,
            'template_name' => 'default_v1',
            'is_active' => true,
        ]);
        $v = $t->versions()->create([
            'version' => 1,
            'content' => $content,
            'is_active' => true,
            'is_enabled' => true,
        ]);
        $t->update(['active_version_id' => $v->id]);
    }

    public function test_an_empty_template_leaves_the_services_prompt_untouched(): void
    {
        $this->template('lead_analysis', '');

        $built = 'Analyse PT Example. Return JSON.';
        $compiled = app(AIPromptTemplateService::class)->compilePrompt('lead_analysis', $built);

        $this->assertSame($built, $compiled, 'Creating a template must be inert until it is edited.');
    }

    public function test_a_template_without_the_input_marker_prepends_instead_of_replacing(): void
    {
        $this->template('lead_analysis', 'Always answer in Bahasa Indonesia.');

        $built = 'Analyse PT Example. Return JSON.';
        $compiled = app(AIPromptTemplateService::class)->compilePrompt('lead_analysis', $built);

        $this->assertStringContainsString('Always answer in Bahasa Indonesia.', $compiled);
        $this->assertStringContainsString($built, $compiled, 'The prompt the service built must survive.');
        $this->assertStringStartsWith('Always answer in Bahasa Indonesia.', $compiled);
    }

    public function test_a_template_using_the_input_marker_takes_full_control(): void
    {
        $this->template('lead_analysis', "SYSTEM RULES\n\n{{input}}\n\nEND");

        $compiled = app(AIPromptTemplateService::class)->compilePrompt('lead_analysis', 'DATA');

        $this->assertSame("SYSTEM RULES\n\nDATA\n\nEND", $compiled);
    }

    public function test_variables_are_substituted(): void
    {
        $this->template('lead_enrichment', 'Research {{company_name}} in {{city}}.');

        $compiled = app(AIPromptTemplateService::class)->compilePrompt(
            'lead_enrichment',
            '',
            ['company_name' => 'PT Axindo Humaper', 'city' => 'Jakarta']
        );

        $this->assertSame('Research PT Axindo Humaper in Jakarta.', $compiled);
        $this->assertStringNotContainsString('{{', $compiled);
    }

    public function test_the_sync_command_covers_every_feature_and_is_idempotent(): void
    {
        $this->artisan('leadsy:sync-ai-prompt-templates')->assertSuccessful();

        $covered = AiPromptTemplate::pluck('feature_name')->all();
        foreach (array_keys(\App\Services\AI\AIRoutingService::FEATURE_CATALOG) as $feature) {
            $this->assertContains($feature, $covered, "{$feature} has no editable prompt template.");
        }

        $count = AiPromptTemplate::count();
        $this->artisan('leadsy:sync-ai-prompt-templates')->assertSuccessful();
        $this->assertSame($count, AiPromptTemplate::count(), 'Re-running must not duplicate anything.');
    }

    public function test_every_feature_the_code_calls_gets_a_template(): void
    {
        $this->artisan('leadsy:sync-ai-prompt-templates')->assertSuccessful();
        $covered = AiPromptTemplate::pluck('feature_name')->all();

        $called = [];
        foreach (\Illuminate\Support\Facades\File::allFiles(app_path()) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            if (preg_match_all("/->call\(\s*'([a-z_]+)'/", (string) file_get_contents($file->getPathname()), $m)) {
                $called = array_merge($called, $m[1]);
            }
        }

        foreach (array_unique($called) as $feature) {
            $this->assertContains($feature, $covered, "{$feature} is called in code but has no prompt template.");
        }
    }
}
