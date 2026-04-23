<?php

namespace App\Services\AI;

use App\Models\AiPromptTemplate;
use App\Models\AiPromptTemplateVersion;
use App\Services\AuditService;
use Illuminate\Support\Collection;

class AIPromptTemplateService
{
    public function ensureDefaults(): void
    {
        foreach ($this->defaultTemplates() as $featureName => $content) {
            $template = AiPromptTemplate::firstOrCreate(
                ['feature_name' => $featureName, 'template_name' => 'Default'],
                ['description' => 'System-managed default prompt wrapper', 'is_active' => true]
            );

            if (! $template->versions()->exists()) {
                $version = $template->versions()->create([
                    'version' => 1,
                    'content' => $content,
                    'is_active' => true,
                    'is_enabled' => true,
                ]);

                $template->forceFill(['active_version_id' => $version->id])->save();
            }
        }
    }

    public function listTemplates(): Collection
    {
        $this->ensureDefaults();

        return AiPromptTemplate::with(['activeVersion', 'versions' => fn ($query) => $query->latest('version')])
            ->orderBy('feature_name')
            ->orderBy('template_name')
            ->get();
    }

    public function createVersion(array $data, ?int $userId = null): AiPromptTemplateVersion
    {
        $this->ensureDefaults();

        $template = AiPromptTemplate::firstOrCreate(
            ['feature_name' => $data['feature_name'], 'template_name' => $data['template_name'] ?? 'Default'],
            [
                'description' => $data['description'] ?? null,
                'is_active' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]
        );

        $nextVersion = ((int) $template->versions()->max('version')) + 1;

        $version = $template->versions()->create([
            'version' => $nextVersion,
            'content' => $data['content'],
            'is_active' => false,
            'is_enabled' => true,
            'created_by' => $userId,
        ]);

        $template->forceFill([
            'description' => $data['description'] ?? $template->description,
            'updated_by' => $userId,
        ])->save();

        AuditService::log(
            'prompt_version_created',
            'ai_prompt_templates',
            $template,
            null,
            ['feature_name' => $template->feature_name, 'version_id' => $version->id, 'version' => $version->version],
        );

        return $version->load('template');
    }

    public function activateVersion(AiPromptTemplateVersion $version, ?int $userId = null): AiPromptTemplateVersion
    {
        $template = $version->template;

        $template->versions()->update(['is_active' => false]);
        $version->forceFill([
            'is_active' => true,
            'activated_by' => $userId,
            'activated_at' => now(),
        ])->save();

        $template->forceFill([
            'active_version_id' => $version->id,
            'updated_by' => $userId,
        ])->save();

        AuditService::log(
            'prompt_version_activated',
            'ai_prompt_templates',
            $template,
            null,
            ['feature_name' => $template->feature_name, 'version_id' => $version->id, 'version' => $version->version],
        );

        return $version->fresh(['template']);
    }

    public function getActiveVersionForFeature(string $featureName): ?AiPromptTemplateVersion
    {
        $this->ensureDefaults();

        $template = AiPromptTemplate::with('activeVersion')
            ->where('feature_name', $featureName)
            ->where('is_active', true)
            ->first();

        return $template?->activeVersion;
    }

    public function compilePrompt(string $featureName, string $input, array $variables = []): string
    {
        $version = $this->getActiveVersionForFeature($featureName);
        if (! $version) {
            return $input;
        }

        $template = $version->content;
        $replacements = ['{{input}}' => $input];

        foreach ($variables as $key => $value) {
            $replacements['{{' . $key . '}}'] = is_scalar($value) ? (string) $value : json_encode($value, JSON_PRETTY_PRINT);
        }

        $compiled = strtr($template, $replacements);

        return str_contains($compiled, '{{input}}')
            ? str_replace('{{input}}', $input, $compiled)
            : $compiled;
    }

    public function previewPrompt(string $featureName, string $sampleInput, ?string $content = null): string
    {
        if ($content !== null) {
            return str_contains($content, '{{input}}')
                ? str_replace('{{input}}', $sampleInput, $content)
                : trim($content . "\n\nInput:\n" . $sampleInput);
        }

        return $this->compilePrompt($featureName, $sampleInput);
    }

    protected function defaultTemplates(): array
    {
        return [
            'lead_analysis' => "You are the system AI for lead analysis.\nStay factual, concise, and deterministic.\nReturn the exact schema requested by the feature prompt.\n\nFeature input:\n{{input}}",
            'lead_scoring' => "You are the system AI for lead scoring.\nUse only supplied evidence, avoid hallucinations, and optimize for actionable sales prioritization.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'qualification_analysis' => "You are the system AI for lead qualification.\nKeep outputs strict, structured, and explainable.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'product_matching' => "You are the system AI for product matching.\nPrefer evidence-backed reasoning and keep score calibration stable over time.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'product_understanding' => "You are the system AI for product understanding.\nExtract only evidence-backed product insights and return structured output.\n\nFeature input:\n{{input}}",
            'meeting_evaluation' => "You are the system AI for meeting evaluation.\nSummarize signals, objections, and next actions clearly.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'transcript_evaluation' => "You are the system AI for transcript evaluation.\nExtract sentiment, intent, objections, and next best action with high precision.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'next_action_recommendation' => "You are the system AI for next-action recommendations.\nPrefer practical, low-regret actions for the sales team.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'recommendation_engine' => "You are the system AI recommendation engine.\nKeep outputs explainable and aligned to the configured feature goal.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'summary_generation' => "You are the system AI for summary generation.\nProduce concise summaries without inventing facts.\nReturn only valid JSON when requested.\n\nFeature input:\n{{input}}",
            'revenue_intelligence_analysis' => "You are the system AI for revenue intelligence analysis.\nReason from the supplied signal set only and stay deterministic.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
            'whatsapp_analysis' => "You are the system AI for WhatsApp conversation analysis.\nDetect commercial intent carefully and keep confidence calibrated.\nReturn only valid JSON.\n\nFeature input:\n{{input}}",
        ];
    }
}
