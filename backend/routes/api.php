<?php

use App\Http\Controllers\Api\AiProviderController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FunnelController;
use App\Http\Controllers\Api\IndustryController;
use App\Http\Controllers\Api\IntegrationConfigController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TerritoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\MapDiscoveryController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use App\Http\Controllers\Api\AiFeatureRouteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Leads Generator Platform
|--------------------------------------------------------------------------
| BRD-aligned API surface. All protected routes require Sanctum auth.
| RBAC enforced via 'permission' middleware on sensitive endpoints.
*/

// ── Health Check (Public) ──
Route::get('health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});

// ── Auth (public) ──
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
});

// ── Public Integrations (e.g. Browser Maps Key, APP_NAME, APP_ENV) ──
Route::get('settings/public', [IntegrationConfigController::class, 'publicSettings']);

// ── Webhooks (Must be outside Sanctum) ──
Route::prefix('webhooks')->group(function () {
    Route::post('whatsapp', [WhatsAppWebhookController::class, 'handle']);
});

// ── Protected routes ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Maps — Lead Discovery
    Route::prefix('maps')->group(function () {
        Route::get('geocode', [MapDiscoveryController::class, 'geocode']);
        Route::get('search', [MapDiscoveryController::class, 'search']);
        Route::get('place-details/{placeId}', [MapDiscoveryController::class, 'placeDetails']);
        Route::post('add-to-leads', [MapDiscoveryController::class, 'addToLeads']);
        Route::post('bulk-add-to-leads', [MapDiscoveryController::class, 'bulkAddToLeads']);
        Route::get('search-history', [MapDiscoveryController::class, 'searchHistory']);
    });

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('dashboard/heatmap', [DashboardController::class, 'heatmap']);

    // Leads — CRUD + Discovery + Export
    Route::get('leads/export', [LeadController::class, 'export'])->middleware('permission:leads.export');
    Route::post('leads/discover', [LeadController::class, 'discover'])->middleware('permission:leads.create');
    Route::post('leads/bulk-import', [LeadController::class, 'bulkImport'])->middleware('permission:leads.create');
    Route::apiResource('leads', LeadController::class);
    Route::post('leads/{lead}/push-to-funnel', [LeadController::class, 'pushToFunnel'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/rescore', [LeadController::class, 'rescore'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/activities', [LeadController::class, 'logActivity'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/meetings', [LeadController::class, 'logMeeting'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contacts', [LeadController::class, 'addContact'])->middleware('permission:leads.edit');
    Route::put('leads/{lead}/contacts/{contact}', [LeadController::class, 'updateContact'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/contacts/{contact}/set-primary', [LeadController::class, 'setPrimaryContact'])->middleware('permission:leads.edit');

    // Territories
    Route::apiResource('territories', TerritoryController::class);

    // Products
    Route::apiResource('products', ProductController::class);

    // Industries
    Route::apiResource('industries', IndustryController::class)->except(['show']);
    Route::post('industries/{industry}/sub-industries', [IndustryController::class, 'storeSub']);
    Route::delete('industries/{industry}/sub-industries/{sub}', [IndustryController::class, 'destroySub']);

    // Funnel
    Route::get('funnel/stages', [FunnelController::class, 'stages']);
    Route::post('funnel/stages', [FunnelController::class, 'storeStage']);
    Route::put('funnel/stages/{stage}', [FunnelController::class, 'updateStage']);
    Route::get('funnel/dashboard', [FunnelController::class, 'dashboard']);

    // AI Providers — must register usage-summary BEFORE apiResource to avoid route collision
    Route::get('ai-providers/usage-summary', [AiProviderController::class, 'usageSummary']);
    Route::apiResource('ai-providers', AiProviderController::class)->except(['show']);
    Route::post('ai-providers/{aiProvider}/test', [AiProviderController::class, 'testConnection']);
    Route::post('ai-providers/{aiProvider}/models', [AiProviderController::class, 'storeModel']);
    Route::delete('ai-providers/{aiProvider}/models/{model}', [AiProviderController::class, 'destroyModel']);
    Route::get('ai-model-routes', [AiProviderController::class, 'routes']);
    Route::post('ai-model-routes', [AiProviderController::class, 'storeRoute']);
    
    // AI Feature Routing (Priority Engine)
    Route::apiResource('ai-feature-routes', AiFeatureRouteController::class)->except(['show', 'update']);

    // Integration Configurations (settings)
    Route::get('settings/integrations', [IntegrationConfigController::class, 'index'])->middleware('permission:audit.view');
    Route::post('settings/integrations', [IntegrationConfigController::class, 'store'])->middleware('permission:audit.view');
    Route::delete('settings/integrations/{integrationConfig}', [IntegrationConfigController::class, 'destroy'])->middleware('permission:audit.view');

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

    // WhatsApp — Broadcast Campaigns
    Route::get('whatsapp/campaigns', [WhatsAppController::class, 'listCampaigns']);
    Route::post('whatsapp/campaigns', [WhatsAppController::class, 'createCampaign']);
    Route::post('whatsapp/campaigns/{campaign}/execute', [WhatsAppController::class, 'executeCampaign']);

    // WhatsApp — Sync Rules
    Route::get('whatsapp/sync-rules', [WhatsAppController::class, 'getSyncRules']);
    Route::post('whatsapp/sync-rules', [WhatsAppController::class, 'updateSyncRules']);

    // Users & Roles — restricted to admin
    Route::apiResource('users', UserController::class)->middleware('permission:users.manage');
    Route::get('roles', [UserController::class, 'roles']);
    Route::post('roles', [UserController::class, 'storeRole'])->middleware('permission:users.manage');
    Route::put('roles/{role}', [UserController::class, 'updateRole'])->middleware('permission:users.manage');

    // Audit Logs — restricted
    Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
    Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show'])->middleware('permission:audit.view');
});
