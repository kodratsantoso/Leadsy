<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Clean up redundant and legacy AI feature keys at the database level.
 *
 * Consolidates:
 * 1. `professional_service_task_breakdown` -> canonical `ps_task_breakdown_generation`
 * 2. Removes unused duplicate aliases from `ai_feature_routes` and `ai_prompt_templates`
 *
 * Strictly non-destructive to business data (leads, users, analytics).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Consolidate professional services breakdown to canonical key
        $legacyTemplate = DB::table('ai_prompt_templates')
            ->where('feature_name', 'professional_service_task_breakdown')
            ->first();

        $canonicalTemplate = DB::table('ai_prompt_templates')
            ->where('feature_name', 'ps_task_breakdown_generation')
            ->first();

        if ($legacyTemplate && ! $canonicalTemplate) {
            DB::table('ai_prompt_templates')
                ->where('id', $legacyTemplate->id)
                ->update([
                    'feature_name' => 'ps_task_breakdown_generation',
                    'description' => 'Professional Service Task Breakdown — AI task and subtask breakdown generation for estimations.',
                ]);
        } elseif ($legacyTemplate && $canonicalTemplate) {
            DB::table('ai_prompt_template_versions')
                ->where('ai_prompt_template_id', $legacyTemplate->id)
                ->delete();

            DB::table('ai_prompt_templates')
                ->where('id', $legacyTemplate->id)
                ->delete();
        }

        // 2. Remove redundant routes for professional_service_task_breakdown
        // (canonical ps_task_breakdown_generation already has its routes configured)
        DB::table('ai_feature_routes')
            ->where('feature_name', 'professional_service_task_breakdown')
            ->delete();

        // 3. Remove redundant routes for customer_success_playbook alias
        // (canonical cs_playbook_ai already has its routes configured)
        DB::table('ai_feature_routes')
            ->where('feature_name', 'customer_success_playbook')
            ->delete();

        // 4. Remove duplicate unused transcript_evaluation and conversation_evaluation templates
        $orphanedTemplates = [
            'transcript_evaluation',
            'conversation_evaluation',
        ];

        foreach ($orphanedTemplates as $orphanKey) {
            $orphan = DB::table('ai_prompt_templates')->where('feature_name', $orphanKey)->first();
            if ($orphan) {
                DB::table('ai_feature_routes')->where('feature_name', $orphanKey)->delete();
                DB::table('ai_prompt_template_versions')->where('ai_prompt_template_id', $orphan->id)->delete();
                DB::table('ai_prompt_templates')->where('id', $orphan->id)->delete();
            }
        }
    }

    public function down(): void
    {
        // Non-destructive
    }
};
