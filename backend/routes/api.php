<?php

use App\Http\Controllers\Api\AiFeatureRouteController;
use App\Http\Controllers\Api\AiProviderController;
use App\Http\Controllers\Api\AiSettingsController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ContactEnrichmentController;
use App\Http\Controllers\Api\CurrencySettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FunnelController;
use App\Http\Controllers\Api\IcpProfileController;
use App\Http\Controllers\Api\IndustryController;
use App\Http\Controllers\Api\IntegrationConfigController;
use App\Http\Controllers\Api\IntegrationPlatformController;
use App\Http\Controllers\Api\LarkController;
use App\Http\Controllers\Api\LeadChannelTypeController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\LeadSourceTypeController;
use App\Http\Controllers\Api\MapDiscoveryController;
use App\Http\Controllers\Api\OpenSearchController;
use App\Http\Controllers\Api\PreMeetingBriefController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\QualificationController;
use App\Http\Controllers\Api\QualificationParameterSetController;
use App\Http\Controllers\Api\QualificationWorkflowController;
use App\Http\Controllers\Api\QualificationWorkflowReviewController;
use App\Http\Controllers\Api\RevenueRuleController;
use App\Http\Controllers\Api\SalesVisitController;
use App\Http\Controllers\Api\TargetController;
use App\Http\Controllers\Api\TerritoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Leadsy Platform
|--------------------------------------------------------------------------
| BRD-aligned API surface. All protected routes require Sanctum auth.
| RBAC enforced via 'permission' middleware on sensitive endpoints.
*/

// ── Health Check (Public) ──
Route::get('health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});

// ── Version (Public) ──
Route::get('version', function () {
    return response()->json([
        'version' => config('version.version', '1.0.0'),
        'released_at' => config('version.released_at'),
        'type' => config('version.type'),
        'notes' => config('version.notes'),
    ]);
});

// ── Auth (public) ──
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('send-otp', [AuthController::class, 'sendOtp']);
    Route::post('register', [AuthController::class, 'register']);
    Route::get('lark/tenants', [AuthController::class, 'getLarkTenants']);
    Route::get('lark/auth-url', [AuthController::class, 'getLarkAuthUrl']);
    Route::post('lark/callback', [AuthController::class, 'handleLarkCallback']);
});

// ── Public Integrations (e.g. Browser Maps Key, APP_NAME, APP_ENV) ──
Route::get('settings/public', [IntegrationConfigController::class, 'publicSettings']);
Route::get('opensearch/contacts', [OpenSearchController::class, 'searchContacts']);

// ── Webhooks (Must be outside Sanctum) ──
Route::prefix('webhooks')->group(function () {
    Route::post('whatsapp', [WhatsAppWebhookController::class, 'handle']);
});

// ── Protected routes ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Maps — Lead Discovery + Geo Product Fit Intelligence
    Route::prefix('maps')->group(function () {
        Route::get('categories', [MapDiscoveryController::class, 'categories']);
        Route::get('geocode', [MapDiscoveryController::class, 'geocode']);
        Route::get('search', [MapDiscoveryController::class, 'search']);
        Route::get('place-details/{placeId}', [MapDiscoveryController::class, 'placeDetails']);
        Route::post('add-to-leads', [MapDiscoveryController::class, 'addToLeads']);
        Route::post('bulk-add-to-leads', [MapDiscoveryController::class, 'bulkAddToLeads']);
        Route::get('search-history', [MapDiscoveryController::class, 'searchHistory']);
        // Geo Product Fit Intelligence
        Route::post('geo-product-fit/analyze', [MapDiscoveryController::class, 'analyzeProductFit']);
        Route::get('geo-product-fit/results', [MapDiscoveryController::class, 'productFitResults']);
    });

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::post('dashboard/ai-insight', [DashboardController::class, 'aiInsight']);
    Route::get('dashboard/heatmap', [DashboardController::class, 'heatmap']);
    Route::get('dashboard/team-kpis', [DashboardController::class, 'teamKpis']);

    // Leads — CRUD + Discovery + Export
    Route::get('leads/export', [LeadController::class, 'export'])->middleware('permission:leads.export');
    Route::post('leads/discover', [LeadController::class, 'discover'])->middleware('permission:leads.create');
    Route::post('leads/bulk-import', [LeadController::class, 'bulkImport'])->middleware('permission:leads.create');
    Route::post('leads/batch-delete', [LeadController::class, 'batchDelete']);
    Route::get('leads/assignable-users', [LeadController::class, 'assignableUsers'])->middleware('permission:leads.edit');
    Route::apiResource('leads', LeadController::class);
    Route::apiResource('business-categories', \App\Http\Controllers\Api\BusinessCategoryController::class);
    Route::post('leads/{lead}/enrich', [\App\Http\Controllers\Api\LeadEnrichmentController::class, 'enrich'])->middleware('permission:leads.edit');
    Route::apiResource('settings/lead-sources', LeadSourceTypeController::class)->except(['show'])->middleware('permission:leads.edit');
    Route::apiResource('settings/lead-channels', LeadChannelTypeController::class)->except(['show'])->middleware('permission:leads.edit');
    Route::get('settings/currency-format', [CurrencySettingController::class, 'format']);
    Route::get('settings/currency', [CurrencySettingController::class, 'index'])->middleware('permission:integrations.manage');
    Route::put('settings/currency', [CurrencySettingController::class, 'update'])->middleware('permission:integrations.manage');
    Route::post('settings/currency/sync-rates', [CurrencySettingController::class, 'syncRates'])->middleware('permission:integrations.manage');
    Route::get('settings/targets', [TargetController::class, 'index'])->middleware('permission:users.manage');
    Route::post('settings/targets', [TargetController::class, 'update'])->middleware('permission:users.manage');
    Route::post('leads/{lead}/push-to-funnel', [LeadController::class, 'pushToFunnel'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/claim', [LeadController::class, 'claim'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/assign', [LeadController::class, 'assign'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/rescore', [LeadController::class, 'rescore'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/activities', [LeadController::class, 'logActivity'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/meetings', [LeadController::class, 'logMeeting'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contacts', [LeadController::class, 'addContact'])->middleware('permission:leads.edit');
    Route::put('leads/{lead}/contacts/{contact}', [LeadController::class, 'updateContact'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/contacts/{contact}', [LeadController::class, 'deleteContact'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contacts/{contact}/set-primary', [LeadController::class, 'setPrimaryContact'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/enrich-contacts', [LeadController::class, 'triggerContactEnrichment'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/contact-enrichment/google-linkedin/candidates', [ContactEnrichmentController::class, 'googleCandidates'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/contact-enrichment/google-linkedin/search', [ContactEnrichmentController::class, 'searchGoogleLinkedin'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contact-enrichment/google-linkedin/candidates/{candidate}/add-contact', [ContactEnrichmentController::class, 'addGoogleCandidateToContact'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/contact-enrichment/lusha/candidates', [ContactEnrichmentController::class, 'lushaCandidates'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/contact-enrichment/lusha/search', [ContactEnrichmentController::class, 'searchLusha'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contact-enrichment/lusha/candidates/{candidate}/reveal-phone', [ContactEnrichmentController::class, 'revealLushaPhone'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/contact-enrichment/linkedin/candidates', [ContactEnrichmentController::class, 'linkedinCandidates'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/contact-enrichment/linkedin/search', [ContactEnrichmentController::class, 'searchLinkedin'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contact-enrichment/linkedin/candidates/{candidate}/add-contact', [ContactEnrichmentController::class, 'addLinkedinCandidateToContact'])->middleware('permission:leads.edit');

    // Lead Intelligence Routes (Module A — Lead Scoring, Qualification, Product Matching, AI Analysis)
    Route::post('qualification/evaluate', [QualificationController::class, 'evaluate'])->middleware('permission:leads.view');
    Route::apiResource('qualification/parameter-sets', QualificationParameterSetController::class)->middleware('permission:leads.edit');
    Route::post('qualification/parameter-sets/{qualificationParameterSet}/activate', [QualificationParameterSetController::class, 'activate'])->middleware('permission:leads.edit');
    Route::apiResource('qualification/workflows', QualificationWorkflowController::class)->middleware('permission:leads.edit');
    Route::get('qualification/reviews', [QualificationWorkflowReviewController::class, 'index'])->middleware('permission:leads.view');
    Route::post('qualification/reviews', [QualificationWorkflowReviewController::class, 'store'])->middleware('permission:leads.edit');
    Route::put('qualification/reviews/{qualificationWorkflowReview}', [QualificationWorkflowReviewController::class, 'update'])->middleware('permission:leads.edit');
    Route::post('qualification/reviews/{qualificationWorkflowReview}/decision', [QualificationWorkflowReviewController::class, 'decide'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/qualify', [LeadController::class, 'qualify'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/analyze', [LeadController::class, 'analyze'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/match-products', [LeadController::class, 'matchProducts'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/intelligence', [LeadController::class, 'intelligence'])->middleware('permission:leads.view');
    Route::get('leads/{lead}/verification', [LeadController::class, 'verificationStatus'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/verification/request', [LeadController::class, 'requestVerificationReview'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/activities', [LeadController::class, 'getActivities'])->middleware('permission:leads.view');
    Route::get('leads/{lead}/progress', [LeadController::class, 'getProgress'])->middleware('permission:leads.view');
    Route::get('leads/{lead}/bantc-questions', [LeadController::class, 'getBantcQuestions'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/bantc-questions/generate', [LeadController::class, 'generateBantcQuestions'])->middleware('permission:leads.edit');
    Route::put('leads/{lead}/bantc-questions', [LeadController::class, 'saveBantcQuestions'])->middleware('permission:leads.edit');

    // Revenue Intelligence Routes (Module D — ICP, Conversion, Prescriptive, Rules, Feedback)
    Route::post('leads/{lead}/icp-match', [LeadController::class, 'icpMatch'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/predict-conversion', [LeadController::class, 'predictConversion'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/prescribe', [LeadController::class, 'prescribe'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/revenue-check', [LeadController::class, 'revenueCheck'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/outcome', [LeadController::class, 'recordOutcome'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/revenue-intelligence', [LeadController::class, 'revenueIntelligence'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/revenue-analysis', [LeadController::class, 'runRevenueAnalysis'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/revenue-analysis', [LeadController::class, 'getRevenueAnalysis'])->middleware('permission:leads.view');

    // Lead Activity & Evaluation Routes (Module B — Activities, Meetings, Transcripts, Evaluations)
    Route::put('leads/{lead}/activities/{activity}', [LeadController::class, 'updateActivity'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/activities/{activity}', [LeadController::class, 'deleteActivity'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/meetings', [LeadController::class, 'getMeetings'])->middleware('permission:leads.view');
    Route::put('leads/{lead}/meetings/{meeting}', [LeadController::class, 'updateMeeting'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/meetings/{meeting}', [LeadController::class, 'deleteMeeting'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/transcripts', [LeadController::class, 'getTranscripts'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/transcripts', [LeadController::class, 'storeTranscript'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/transcripts/fetch-link', [LeadController::class, 'fetchTranscriptFromLink'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/transcripts/{transcript}', [LeadController::class, 'deleteTranscript'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/transcripts/{transcript}/evaluate', [LeadController::class, 'evaluateTranscript'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/evaluations', [LeadController::class, 'getEvaluations'])->middleware('permission:leads.view');
    Route::get('leads/{lead}/follow-ups', [LeadController::class, 'getFollowUps'])->middleware('permission:leads.view');
    Route::get('/leads/{lead}/pre-meeting-brief', [\App\Http\Controllers\Api\PreMeetingBriefController::class, 'show'])->middleware('permission:leads.view');
    Route::post('/leads/{lead}/pre-meeting-brief/generate', [\App\Http\Controllers\Api\PreMeetingBriefController::class, 'generate'])->middleware('permission:leads.edit');

    Route::get('/leads/{lead}/customer-journey', [\App\Http\Controllers\Api\CustomerJourneyController::class, 'show'])->middleware('permission:leads.view');
    Route::post('/leads/{lead}/customer-journey/story', [\App\Http\Controllers\Api\CustomerJourneyController::class, 'generateStory'])->middleware('permission:leads.edit');

    // Mobile field sales visits
    Route::get('sales-visits', [SalesVisitController::class, 'index'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/sales-visits/clock-in', [SalesVisitController::class, 'clockIn'])->middleware('permission:leads.edit');
    Route::post('sales-visits/{visit}/clock-out', [SalesVisitController::class, 'clockOut'])->middleware('permission:leads.edit');
    Route::post('sales-visits/{visit}/media', [SalesVisitController::class, 'uploadMedia'])->middleware('permission:leads.edit');

    // Territories
    Route::apiResource('territories', TerritoryController::class);

    // Products — ai-generate must be before apiResource to avoid {product} collision
    Route::post('products/ai-generate', [ProductController::class, 'aiGenerate'])->middleware('permission:products.edit');
    Route::apiResource('products', ProductController::class);

    // Product Question Guide
    Route::prefix('products/{product}/questions')->group(function () {
        Route::get('/', [ProductController::class, 'getQuestions'])->middleware('permission:products.view');
        Route::post('/generate', [ProductController::class, 'generateQuestions'])->middleware('permission:products.edit');
        Route::put('/', [ProductController::class, 'saveQuestions'])->middleware('permission:products.edit');
    });

    // Industries
    Route::apiResource('industries', IndustryController::class)->except(['show']);
    Route::post('industries/{industry}/sub-industries', [IndustryController::class, 'storeSub']);
    Route::put('industries/{industry}/sub-industries/{sub}', [IndustryController::class, 'updateSub']);
    Route::delete('industries/{industry}/sub-industries/{sub}', [IndustryController::class, 'destroySub']);

    // Funnel
    Route::get('funnel/stages', [FunnelController::class, 'stages']);
    Route::post('funnel/stages', [FunnelController::class, 'storeStage'])->middleware('permission:leads.edit');
    Route::put('funnel/stages/{stage}', [FunnelController::class, 'updateStage'])->middleware('permission:leads.edit');
    Route::delete('funnel/stages/{stage}', [FunnelController::class, 'destroyStage'])->middleware('permission:leads.edit');
    Route::get('funnel/dashboard', [FunnelController::class, 'dashboard']);

    // AI Providers — must register usage-summary BEFORE apiResource to avoid route collision
    Route::get('ai-providers/usage-summary', [AiProviderController::class, 'usageSummary'])->middleware('permission:ai.manage');
    Route::apiResource('ai-providers', AiProviderController::class)->except(['show'])->middleware('permission:ai.manage');
    Route::post('ai-providers/{aiProvider}/test', [AiProviderController::class, 'testConnection'])->middleware('permission:ai.manage');
    Route::post('ai-providers/{aiProvider}/models', [AiProviderController::class, 'storeModel'])->middleware('permission:ai.manage');
    Route::delete('ai-providers/{aiProvider}/models/{model}', [AiProviderController::class, 'destroyModel'])->middleware('permission:ai.manage');
    Route::get('ai-model-routes', [AiProviderController::class, 'routes'])->middleware('permission:ai.manage');
    Route::post('ai-model-routes', [AiProviderController::class, 'storeRoute'])->middleware('permission:ai.manage');

    // AI Feature Routing (Priority Engine)
    Route::apiResource('ai-feature-routes', AiFeatureRouteController::class)->except(['show', 'update'])->middleware('permission:ai.manage');

    // Consolidated AI Settings Control Center
    Route::prefix('settings/ai-default')->middleware('permission:ai.manage')->group(function () {
        Route::get('/', [AiSettingsController::class, 'index']);
        Route::post('providers', [AiSettingsController::class, 'storeProvider']);
        Route::put('providers/{aiProvider}', [AiSettingsController::class, 'updateProvider']);
        Route::delete('providers/{aiProvider}', [AiSettingsController::class, 'destroyProvider']);
        Route::post('providers/{aiProvider}/test', [AiSettingsController::class, 'testProvider']);
        Route::post('providers/{aiProvider}/reveal-key', [AiSettingsController::class, 'revealKey']);
        Route::post('providers/{aiProvider}/copy-key-audit', [AiSettingsController::class, 'auditCopyKey']);
        Route::post('providers/{aiProvider}/models', [AiSettingsController::class, 'storeModel']);
        Route::delete('providers/{aiProvider}/models/{model}', [AiSettingsController::class, 'destroyModel']);
        Route::put('feature-routes/{featureName}', [AiSettingsController::class, 'saveFeatureRoutes']);
        Route::get('prompt-templates', [AiSettingsController::class, 'promptTemplates']);
        Route::post('prompt-templates/versions', [AiSettingsController::class, 'createPromptVersion']);
        Route::post('prompt-templates/versions/{version}/activate', [AiSettingsController::class, 'activatePromptVersion']);
        Route::post('prompt-templates/preview', [AiSettingsController::class, 'previewPrompt']);
    });

    // Integration Configurations (settings)
    Route::get('settings/integrations', [IntegrationConfigController::class, 'index'])->middleware('permission:integrations.manage');
    Route::get('settings/integrations/google/permissions', [IntegrationConfigController::class, 'googlePermissions'])->middleware('permission:integrations.manage');
    Route::post('settings/integrations', [IntegrationConfigController::class, 'store'])->middleware('permission:integrations.manage');
    Route::delete('settings/integrations/{integrationConfig}', [IntegrationConfigController::class, 'destroy'])->middleware('permission:integrations.manage');
    Route::get('settings/integration-platforms', [IntegrationPlatformController::class, 'registry'])->middleware('permission:integrations.manage');
    Route::post('settings/integration-platforms/{platform}/oauth-url', [IntegrationPlatformController::class, 'oauthUrl'])->middleware('permission:integrations.manage');
    Route::post('settings/integration-platforms/{platform}/test', [IntegrationPlatformController::class, 'test'])->middleware('permission:integrations.manage');
    Route::get('settings/integration-platforms/{platform}/preview', [IntegrationPlatformController::class, 'preview'])->middleware('permission:integrations.manage');

    // Database Backups
    Route::get('settings/backups', [BackupController::class, 'index'])->middleware('permission:integrations.manage');
    // We name the file download route segment carefully to avoid any route naming collisions
    Route::post('settings/backups', [BackupController::class, 'backup'])->middleware('permission:integrations.manage');
    Route::get('settings/backups/{filename}/download', [BackupController::class, 'download'])->middleware('permission:integrations.manage');
    Route::delete('settings/backups/{filename}', [BackupController::class, 'destroy'])->middleware('permission:integrations.manage');

    // WhatsApp — Session
    Route::post('whatsapp/session/init', [WhatsAppController::class, 'initSession']);
    Route::get('whatsapp/session/status', [WhatsAppController::class, 'status']);
    Route::post('whatsapp/session/refresh-qr', [WhatsAppController::class, 'refreshQr']);
    Route::post('whatsapp/session/disconnect', [WhatsAppController::class, 'disconnect']);

    // WhatsApp — Direct Messaging
    Route::post('whatsapp/messages/send', [WhatsAppController::class, 'sendMessage']);

    // WhatsApp — Conversations
    Route::get('whatsapp/conversations', [WhatsAppController::class, 'getConversations']);
    Route::get('whatsapp/conversations/{id}/messages', [WhatsAppController::class, 'getConversationMessages']);
    Route::post('whatsapp/conversations/{id}/analyze', [WhatsAppController::class, 'analyzeConversation']);
    Route::post('whatsapp/conversations/{id}/convert-to-lead', [WhatsAppController::class, 'convertToLead']);

    // WhatsApp — Settings / Active Users Monitor
    Route::get('settings/whatsapp/active-users', [WhatsAppController::class, 'activeUsers'])->middleware('permission:integrations.manage');
    Route::post('settings/whatsapp/active-users/{userId}/disconnect', [WhatsAppController::class, 'disconnectUser'])->middleware('permission:integrations.manage');

    // WhatsApp — Broadcast Campaigns
    Route::get('whatsapp/campaigns', [WhatsAppController::class, 'listCampaigns']);
    Route::post('whatsapp/campaigns', [WhatsAppController::class, 'createCampaign']);
    Route::post('whatsapp/campaigns/{campaign}/execute', [WhatsAppController::class, 'executeCampaign']);
    Route::put('whatsapp/campaigns/{campaign}', [WhatsAppController::class, 'updateCampaign']);
    Route::delete('whatsapp/campaigns/{campaign}', [WhatsAppController::class, 'destroyCampaign']);

    // WhatsApp — Sync Rules
    Route::get('whatsapp/sync-rules', [WhatsAppController::class, 'getSyncRules']);
    Route::post('whatsapp/sync-rules', [WhatsAppController::class, 'updateSyncRules']);

    // Users & Roles — restricted to admin
    Route::apiResource('users', UserController::class)->middleware('permission:users.manage');
    Route::get('roles', [UserController::class, 'roles']);
    Route::get('permissions', [UserController::class, 'permissions'])->middleware('permission:users.manage');
    Route::post('roles', [UserController::class, 'storeRole'])->middleware('permission:users.manage');
    Route::put('roles/{role}', [UserController::class, 'updateRole'])->middleware('permission:users.manage');
    Route::delete('roles/{role}', [UserController::class, 'destroyRole'])->middleware('permission:users.manage');

    // Audit Logs — restricted
    Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
    Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show'])->middleware('permission:audit.view');

    // Revenue Intelligence — ICP Profiles
    Route::post('icp-profiles/generate', [IcpProfileController::class, 'generate'])->middleware('permission:leads.edit');
    Route::apiResource('icp-profiles', IcpProfileController::class);
    Route::post('icp-profiles/{icpProfile}/batch-match', [IcpProfileController::class, 'batchMatch'])->middleware('permission:leads.edit');

    // Revenue Intelligence — Revenue Rules
    Route::get('revenue-rules', [RevenueRuleController::class, 'index']);
    Route::post('revenue-rules', [RevenueRuleController::class, 'store'])->middleware('permission:leads.edit');
    Route::put('revenue-rules/{revenueRule}', [RevenueRuleController::class, 'update'])->middleware('permission:leads.edit');
    Route::delete('revenue-rules/{revenueRule}', [RevenueRuleController::class, 'destroy'])->middleware('permission:leads.edit');

    // Revenue Intelligence — Analytics
    Route::get('analytics/pipeline-quality', [AnalyticsController::class, 'pipelineQuality'])->middleware('permission:leads.view');
    Route::get('analytics/source-quality', [AnalyticsController::class, 'sourceQuality'])->middleware('permission:leads.view');

    // Lark Integration
    Route::prefix('lark')->group(function () {
        Route::get('config', [LarkController::class, 'getConfig']);
        Route::post('config', [LarkController::class, 'saveConfig'])->middleware('permission:integrations.manage');
        Route::post('test-connection', [LarkController::class, 'testConnection'])->middleware('permission:integrations.manage');
        Route::post('toggle-module', [LarkController::class, 'toggleModule'])->middleware('permission:integrations.manage');
        Route::get('status', [LarkController::class, 'getStatus']);
        Route::get('sync-history', [LarkController::class, 'getSyncHistory'])->middleware('permission:audit.view');
        Route::get('event-log', [LarkController::class, 'getEventLog'])->middleware('permission:audit.view');
        Route::get('base/tables', [LarkController::class, 'listBaseTables'])->middleware('permission:integrations.manage');
        Route::get('base/fields', [LarkController::class, 'listBaseFields'])->middleware('permission:integrations.manage');
        Route::get('base/records/preview', [LarkController::class, 'previewBaseRecords'])->middleware('permission:integrations.manage');
        Route::get('base/mappings', [LarkController::class, 'getBaseMappings'])->middleware('permission:integrations.manage');
        Route::post('base/mappings', [LarkController::class, 'saveBaseMapping'])->middleware('permission:integrations.manage');
        Route::post('base/mappings/{baseTable}/sync', [LarkController::class, 'syncBaseMapping'])->middleware('permission:integrations.manage');
        Route::delete('base/mappings/{baseTable}', [LarkController::class, 'deleteBaseMapping'])->middleware('permission:integrations.manage');
    });
});

// ── Lark Webhooks (Public) ──
Route::prefix('webhooks')->group(function () {
    Route::post('lark', [LarkController::class, 'handleWebhook']);
});
