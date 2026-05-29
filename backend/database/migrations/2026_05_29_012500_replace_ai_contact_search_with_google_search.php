<?php

use App\Models\AiPromptTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('ai_feature_routes')
            ->where('feature_name', 'lead_contact_ai_search')
            ->delete();

        AiPromptTemplate::query()
            ->where('feature_name', 'lead_contact_ai_search')
            ->get()
            ->each(function (AiPromptTemplate $template): void {
                $template->forceFill(['active_version_id' => null])->save();
                $template->versions()->delete();
                $template->delete();
            });

        $template = AiPromptTemplate::firstOrCreate(
            ['feature_name' => 'lead_contact_google_search_keyword', 'template_name' => 'Default'],
            ['description' => 'System-managed Google LinkedIn search keyword template', 'is_active' => true]
        );

        $content = 'site:linkedin.com/in "{{company_name}}" ("manager" OR "director" OR "head" OR "general manager" OR "finance" OR "operations" OR "procurement" OR "IT" OR "sales")';
        $activeVersion = $template->activeVersion;

        if (! $activeVersion || trim($activeVersion->content) !== $content) {
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
                'description' => 'System-managed Google LinkedIn search keyword template',
                'is_active' => true,
            ])->save();
        }
    }

    public function down(): void
    {
        DB::table('ai_feature_routes')
            ->where('feature_name', 'lead_contact_google_search_keyword')
            ->delete();

        AiPromptTemplate::query()
            ->where('feature_name', 'lead_contact_google_search_keyword')
            ->get()
            ->each(function (AiPromptTemplate $template): void {
                $template->forceFill(['active_version_id' => null])->save();
                $template->versions()->delete();
                $template->delete();
            });
    }
};
