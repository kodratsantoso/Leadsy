<?php

namespace App\Console\Commands;

use App\Models\AiPromptTemplate;
use App\Services\AI\AIRoutingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Guarantees every AI feature has a prompt row an operator can edit.
 *
 * Only three of the twenty-four features that call the AI shipped a template, so for the
 * rest the prompt lived in PHP and Settings -> AI Defaults could not reach it. Creating
 * templates used to be unsafe — one without `{{input}}` discarded whatever the service
 * had built — so this command is only correct alongside the composing behaviour in
 * AIPromptTemplateService::compose(): a template is now instructions that come first,
 * with the service's own prompt following.
 *
 * Idempotent and additive. An existing template is never touched, so anything already
 * written in the UI survives.
 */
class SyncAiPromptTemplatesCommand extends Command
{
    protected $signature = 'leadsy:sync-ai-prompt-templates {--dry-run : List what would be created without writing}';

    protected $description = 'Create an editable prompt template for every AI feature that lacks one';

    public function handle(): int
    {
        $features = $this->discoverFeatures();
        $existing = AiPromptTemplate::pluck('feature_name')->all();
        $missing = array_values(array_diff($features, $existing));

        if ($missing === []) {
            $this->info('Every AI feature already has a prompt template ('.count($features).' features).');

            return self::SUCCESS;
        }

        $this->line(count($missing).' of '.count($features).' features have no prompt template:');

        foreach ($missing as $feature) {
            $label = AIRoutingService::FEATURE_CATALOG[$feature] ?? $feature;
            $this->line("  - {$feature}  ({$label})");

            if ($this->option('dry-run')) {
                continue;
            }

            $template = AiPromptTemplate::create([
                'feature_name' => $feature,
                'template_name' => 'default_v1',
                'description' => $label.' — extra instructions prepended to the prompt this feature builds in code.',
                'is_active' => true,
            ]);

            // Empty on purpose: an empty template composes to exactly the prompt the
            // service already sends, so creating it changes nothing until someone edits
            // it. That is what makes running this safe on a live system.
            $version = $template->versions()->create([
                'version' => 1,
                'content' => '',
                'is_active' => true,
                'is_enabled' => true,
            ]);

            $template->update(['active_version_id' => $version->id]);
        }

        if ($this->option('dry-run')) {
            $this->comment('Dry run — nothing was written.');

            return self::SUCCESS;
        }

        $this->info('Created '.count($missing).' prompt template(s). They start empty, so behaviour is unchanged until edited.');

        return self::SUCCESS;
    }

    /**
     * Every feature key the code actually calls, plus anything already named in the
     * catalog. Scanning the source keeps this honest when a new ->call() is added and
     * nobody remembers to register it.
     *
     * @return list<string>
     */
    private function discoverFeatures(): array
    {
        $keys = array_keys(AIRoutingService::FEATURE_CATALOG);

        foreach (File::allFiles(app_path()) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            if (preg_match_all("/->call\(\s*'([a-z_]+)'/", (string) file_get_contents($file->getPathname()), $m)) {
                $keys = array_merge($keys, $m[1]);
            }
        }

        $keys = array_values(array_unique($keys));
        sort($keys);

        return $keys;
    }
}
