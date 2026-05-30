<?php

use App\Models\AiPromptTemplate;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(AIPromptTemplateService::class);
        $reflection = new ReflectionClass($service);
        $method = $reflection->getMethod('defaultTemplates');
        $method->setAccessible(true);
        $templates = $method->invoke($service);

        if (isset($templates['dashboard_ai_insight'])) {
            $featureName = 'dashboard_ai_insight';
            $content = $templates['dashboard_ai_insight'];

            $template = AiPromptTemplate::firstOrCreate(
                ['feature_name' => $featureName, 'template_name' => 'Default'],
                ['description' => 'Detailed system-managed default prompt wrapper', 'is_active' => true]
            );

            $activeVersion = $template->activeVersion;
            if (!$activeVersion || trim($activeVersion->content) !== trim($content)) {
                $version = $template->versions()->create([
                    'version' => ((int) $template->versions()->max('version')) + 1,
                    'content' => $content,
                    'is_active' => false,
                    'is_enabled' => true,
                ]);

                $template->versions()->update(['is_active' => false]);
                $version->forceFill([
                    'is_active' => true,
                    'activated_at' => now(),
                ])->save();

                $template->forceFill([
                    'active_version_id' => $version->id,
                ])->save();
            }
        }
    }

    public function down(): void
    {
        // Prompt versions are history records. Keep intact on rollback.
    }
};
