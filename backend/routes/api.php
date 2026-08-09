<?php

use App\Http\Controllers\Api\AiFeatureRouteController;
use App\Http\Controllers\Api\AiProviderController;
use App\Http\Controllers\Api\AiLeadProfilingController;
use App\Http\Controllers\LarkBaseMappingController;
use App\Http\Controllers\MeetingSummaryPdfController;
use App\Http\Controllers\Api\AiSettingsController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ContactEnrichmentController;
use App\Http\Controllers\Api\CurrencySettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TeamPerformanceDashboardController;
use App\Http\Controllers\Api\ConfidentialityDashboardController;
use App\Http\Controllers\Api\KpiSettingsController;
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
use App\Http\Controllers\Api\TargetConfigController;
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
    Route::post('auth/token/generate', [AuthController::class, 'generateApiToken']);
    Route::get('auth/token/status', [AuthController::class, 'getApiTokenStatus']);

    // Global Search
    Route::get('search', [\App\Http\Controllers\Api\GlobalSearchController::class, 'search']);

    // Custom Workflow Engine
    Route::apiResource('workflows', \App\Http\Controllers\Api\WorkflowDefinitionController::class);
    Route::post('workflows/{workflow}/activate', [\App\Http\Controllers\Api\WorkflowDefinitionController::class, 'activate']);
    
    // Custom Workflow Engine for Quotations
    Route::get('quotations/{quotation}/workflow-transitions', [\App\Http\Controllers\Api\QuotationWorkflowController::class, 'getTransitions']);
    Route::post('quotations/{quotation}/workflow-transitions', [\App\Http\Controllers\Api\QuotationWorkflowController::class, 'executeTransition']);

    // Maps — Lead Discovery + Geo Product Fit Intelligence
    Route::prefix('maps')->middleware('permission:maps.view')->group(function () {
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

    // Lead Generator - IDX
    Route::prefix('lead-generator/idx-companies')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\LeadGeneratorIdxController::class, 'index']);
        Route::get('/filters', [\App\Http\Controllers\Api\LeadGeneratorIdxController::class, 'filters']);
        Route::post('import', [\App\Http\Controllers\Api\LeadGeneratorIdxController::class, 'import']);
    });

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/team-performance', [TeamPerformanceDashboardController::class, 'index']);
    Route::get('/dashboard/team-performance/drilldown', [TeamPerformanceDashboardController::class, 'drilldown']);
    
    // Confidentiality Dashboard
    Route::get('/dashboard/confidentiality', [ConfidentialityDashboardController::class, 'index']);
    Route::get('/dashboard/confidentiality/drilldown', [ConfidentialityDashboardController::class, 'drilldown']);
    Route::get('/confidentiality/assessments/{entityType}/{entityId}', [ConfidentialityDashboardController::class, 'show']);
    Route::post('/confidentiality/assessments/{entityType}/{entityId}/recalculate', [ConfidentialityDashboardController::class, 'recalculate']);
    Route::post('/confidentiality/assessments/{id}/approve', [ConfidentialityDashboardController::class, 'approve']);
    Route::get('/dashboard/confidentiality-matrix', [DashboardController::class, 'confidentialityMatrix']);
    Route::post('/dashboard/ai-insight', [DashboardController::class, 'aiInsight']);
    
    // AI Governance (Outputs & Highlights)
    Route::get('/ai-outputs/{id}/history', [\App\Http\Controllers\Api\AiOutputController::class, 'history']);
    Route::put('/ai-outputs/{id}', [\App\Http\Controllers\Api\AiOutputController::class, 'update']);
    Route::post('/ai-outputs/{id}/approve', [\App\Http\Controllers\Api\AiOutputController::class, 'approve']);
    
    Route::get('/ai-highlights', [\App\Http\Controllers\Api\AiHighlightController::class, 'index']);
    Route::post('/ai-highlights/{id}/resolve', [\App\Http\Controllers\Api\AiHighlightController::class, 'resolve']);

    // Product Specifications & Scrape
    Route::post('/products/{product}/scrape-and-compare', [\App\Http\Controllers\Api\ProductSpecificationController::class, 'scrapeAndCompare']);
    Route::get('/products/{product}/latest-comparison', [\App\Http\Controllers\Api\ProductSpecificationController::class, 'latestComparison']);
    Route::post('/products/{product}/comparisons/{comparison}/approve', [\App\Http\Controllers\Api\ProductSpecificationController::class, 'approve']);
    Route::post('/products/{product}/comparisons/{comparison}/reject', [\App\Http\Controllers\Api\ProductSpecificationController::class, 'reject']);

    // KPI Settings
    Route::get('/kpi-settings/definitions', [KpiSettingsController::class, 'getDefinitions']);
    Route::get('/kpi-settings/targets/{userId}', [KpiSettingsController::class, 'getTargets']);
    Route::post('/kpi-settings/targets/{userId}', [KpiSettingsController::class, 'saveTargets']);

    // Leads — CRUD + Discovery + Export
    Route::get('leads/export', [LeadController::class, 'export'])->middleware('permission:leads.export');
    Route::post('leads/discover', [LeadController::class, 'discover'])->middleware('permission:leads.create');
    Route::post('leads/bulk-import', [LeadController::class, 'bulkImport'])->middleware('permission:leads.create');
    Route::post('leads/batch-delete', [LeadController::class, 'batchDelete']);
    Route::post('leads/ai-profiling/start', [AiLeadProfilingController::class, 'start'])->middleware('permission:leads.ai_profiling');
    Route::get('leads/ai-profiling/{id}/status', [AiLeadProfilingController::class, 'status'])->middleware('permission:leads.ai_profiling');
    Route::get('leads/assignable-users', [LeadController::class, 'assignableUsers'])->middleware('permission:leads.edit');
    Route::apiResource('leads', LeadController::class);
    Route::apiResource('business-categories', \App\Http\Controllers\Api\BusinessCategoryController::class);
    // Unified AI Triggers
    Route::post('leads/bulk-intelligence', [LeadController::class, 'bulkIntelligence'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/run-proofing-strategy', [LeadController::class, 'runProofingStrategy'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/run-intelligence', [LeadController::class, 'runIntelligence'])->middleware('permission:leads.edit');

    Route::post('leads/{lead}/enrich', [\App\Http\Controllers\Api\LeadEnrichmentController::class, 'enrich'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/enrich/retry', [\App\Http\Controllers\Api\LeadEnrichmentController::class, 'retry'])->middleware('permission:leads.edit');
    Route::apiResource('settings/lead-sources', LeadSourceTypeController::class)->except(['show'])->middleware('permission:leads.edit');
    Route::apiResource('settings/lead-channels', LeadChannelTypeController::class)->except(['show'])->middleware('permission:leads.edit');
    Route::get('settings/currency-format', [CurrencySettingController::class, 'format']);
    Route::get('settings/currency', [CurrencySettingController::class, 'index'])->middleware('permission:integrations.manage');
    Route::put('settings/currency', [CurrencySettingController::class, 'update'])->middleware('permission:integrations.manage');
    Route::post('settings/currency/sync-rates', [CurrencySettingController::class, 'syncRates'])->middleware('permission:integrations.manage');
    // Targets
    Route::get('targets/config', [TargetConfigController::class, 'config']);
    
    // Revenue Targets
    Route::apiResource('revenue-targets', \App\Http\Controllers\Api\RevenueTargetController::class);
    Route::post('revenue-targets/{id}/cascade', [\App\Http\Controllers\Api\RevenueTargetController::class, 'cascade']);

    // KPI Targets
    Route::post('kpi-targets/bulk', [\App\Http\Controllers\Api\KpiTargetController::class, 'bulkStore']);
    Route::apiResource('kpi-targets', \App\Http\Controllers\Api\KpiTargetController::class);
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

    // Lead Role Assignments
    Route::get('leads/{lead}/role-assignments', [\App\Http\Controllers\Api\LeadRoleAssignmentController::class, 'index'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/role-assignments', [\App\Http\Controllers\Api\LeadRoleAssignmentController::class, 'store'])->middleware('permission:leads.edit');
    Route::put('leads/{lead}/role-assignments/{assignmentId}', [\App\Http\Controllers\Api\LeadRoleAssignmentController::class, 'update'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/role-assignments/{assignmentId}', [\App\Http\Controllers\Api\LeadRoleAssignmentController::class, 'destroy'])->middleware('permission:leads.edit');

    // Lead Order-to-Cash (Quotations)
    Route::get('leads/{lead}/quotations', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'getQuotations'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/quotations', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'storeQuotation'])->middleware('permission:leads.edit');
    Route::get('quotations/{quotation}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'showQuotation'])->middleware('permission:leads.view');
    Route::put('quotations/{quotation}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'updateQuotation'])->middleware('permission:leads.edit');
    Route::delete('quotations/{quotation}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'destroyQuotation'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/accept', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'acceptQuotation'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/reject', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'rejectQuotation'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/status', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'updateQuotationStatus'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/convert', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'convertToSalesOrder'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/convert-to-sales-order', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'convertToSalesOrder'])->middleware('permission:leads.edit');

    // Lead Order-to-Cash (Sales Orders)
    Route::get('leads/{lead}/sales-orders', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'getSalesOrders'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/sales-orders', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'storeSalesOrder'])->middleware('permission:leads.edit');
    Route::get('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'showSalesOrder'])->middleware('permission:leads.view');
    Route::put('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'updateSalesOrder'])->middleware('permission:leads.edit');
    Route::delete('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'destroySalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/confirm', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'confirmSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/cancel', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'cancelSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/close', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'closeSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/renew', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'createRenewalQuotation'])->middleware('permission:leads.edit');

    /* ── Professional Services Master Data ── */
    Route::group(['prefix' => 'settings/professional-services', 'middleware' => 'permission:professional_services.view'], function () {
        Route::apiResource('service-categories', \App\Http\Controllers\Api\PsServiceCategoryController::class);
        
        Route::apiResource('roles', \App\Http\Controllers\Api\PsRoleController::class);
        Route::post('roles/{id}/rate-cards', [\App\Http\Controllers\Api\PsRoleController::class, 'storeRateCard']);
        Route::put('roles/{id}/rate-cards/{rateCardId}', [\App\Http\Controllers\Api\PsRoleController::class, 'updateRateCard']);
        Route::delete('roles/{id}/rate-cards/{rateCardId}', [\App\Http\Controllers\Api\PsRoleController::class, 'destroyRateCard']);
        
        Route::get('complexity/levels', [\App\Http\Controllers\Api\PsComplexityController::class, 'indexLevels']);
        Route::post('complexity/levels', [\App\Http\Controllers\Api\PsComplexityController::class, 'storeLevel']);
        Route::put('complexity/levels/{id}', [\App\Http\Controllers\Api\PsComplexityController::class, 'updateLevel']);
        Route::delete('complexity/levels/{id}', [\App\Http\Controllers\Api\PsComplexityController::class, 'destroyLevel']);
        
        Route::get('complexity/dimensions', [\App\Http\Controllers\Api\PsComplexityController::class, 'indexDimensions']);
        Route::post('complexity/dimensions', [\App\Http\Controllers\Api\PsComplexityController::class, 'storeDimension']);
        Route::put('complexity/dimensions/{id}', [\App\Http\Controllers\Api\PsComplexityController::class, 'updateDimension']);
        Route::delete('complexity/dimensions/{id}', [\App\Http\Controllers\Api\PsComplexityController::class, 'destroyDimension']);
        
        Route::apiResource('templates', \App\Http\Controllers\Api\PsEstimationTemplateController::class);
    });

    /* ── Professional Services Estimator ── */
    Route::group(['prefix' => 'professional-services', 'middleware' => 'permission:professional_services.view'], function () {

        // Estimations
        Route::get('config', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'config']);
        
        // Estimations
        Route::get('estimations', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'indexEstimations']);
        Route::get('estimations/{id}', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'showEstimation']);
        Route::post('estimations', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'storeEstimation'])->middleware('permission:professional_services.create');
        Route::put('estimations/{id}', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'updateEstimation'])->middleware('permission:professional_services.edit');
        Route::post('estimations/{id}/duplicate', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'duplicateEstimation']);
        Route::post('estimations/{id}/review', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'reviewEstimation'])
            ->middleware('permission:professional_services.review');
        Route::post('estimations/{id}/submit-approval', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'submitApproval']);
        Route::post('estimations/{id}/approve', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'approveEstimation'])
            ->middleware('permission:professional_services.approve');
        Route::post('estimations/{id}/reject', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'rejectEstimation'])
            ->middleware('permission:professional_services.approve');
        Route::post('estimations/{id}/request-revision', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'requestRevision']);
        Route::post('estimations/{id}/create-revision', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'createRevision']);
        
        Route::get('estimations/{id}/blockers', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'blockers']);
        Route::get('estimations/{id}/versions', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'versions']);
        
        // Governance Rules
        Route::get('governance-rules', [App\Http\Controllers\Api\PsGovernanceRuleController::class, 'index']);
        Route::post('governance-rules', [App\Http\Controllers\Api\PsGovernanceRuleController::class, 'store']);
        Route::put('governance-rules/{id}', [App\Http\Controllers\Api\PsGovernanceRuleController::class, 'update']);
        
        // Task Breakdown routes
        Route::get('estimations/{id}/quotation-preview', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'quotationPreview'])->middleware('permission:professional_services.edit');
        Route::post('/professional-services/estimations/{id}/convert-to-quotation', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'convertToQuotation']);

        // Phase 5: Documents
        Route::get('/professional-services/estimations/{id}/documents', [App\Http\Controllers\Api\ProfessionalServiceDocumentController::class, 'index']);
        Route::post('/professional-services/estimations/{id}/documents/generate', [App\Http\Controllers\Api\ProfessionalServiceDocumentController::class, 'generate']);
        Route::get('/professional-services/documents/{id}', [App\Http\Controllers\Api\ProfessionalServiceDocumentController::class, 'show']);
        Route::delete('/professional-services/documents/{id}', [App\Http\Controllers\Api\ProfessionalServiceDocumentController::class, 'destroy']);
        
        // Phase 5: Digital Signature
        Route::post('/professional-services/documents/{id}/send-signature', [App\Http\Controllers\Api\DigitalSignatureController::class, 'sendForSignature']);
        Route::post('/professional-services/documents/{id}/refresh-signature-status', [App\Http\Controllers\Api\DigitalSignatureController::class, 'refreshStatus']);

        Route::apiResource('settings/digital-signature', App\Http\Controllers\Api\DigitalSignatureSettingsController::class);

        // Phase 7: Project Planning Lite
        Route::get('/project-plans', [\App\Http\Controllers\Api\PsProjectPlanController::class, 'index']);
        Route::get('/project-plans/{id}', [\App\Http\Controllers\Api\PsProjectPlanController::class, 'show']);
        Route::post('/estimations/{id}/create-project-plan', [\App\Http\Controllers\Api\PsProjectPlanController::class, 'createFromEstimation']);
        Route::put('/project-plans/{id}', [\App\Http\Controllers\Api\PsProjectPlanController::class, 'update']);
        Route::put('/project-plans/{id}/status', [\App\Http\Controllers\Api\PsProjectPlanController::class, 'updateStatus']);

        // Phase 8: PSA Lite Execution
        Route::get('/psa-dashboard', [\App\Http\Controllers\Api\PsPsaDashboardController::class, 'index']);
        
        Route::get('/settings/psa', [\App\Http\Controllers\Api\PsPsaSettingsController::class, 'show']);
        Route::put('/settings/psa', [\App\Http\Controllers\Api\PsPsaSettingsController::class, 'update']);
        
        Route::get('/work-logs', [\App\Http\Controllers\Api\PsWorkLogController::class, 'index']);
        Route::post('/work-logs', [\App\Http\Controllers\Api\PsWorkLogController::class, 'store']);
        Route::post('/work-logs/{id}/approve', [\App\Http\Controllers\Api\PsWorkLogController::class, 'approve']);
        Route::post('/work-logs/{id}/reject', [\App\Http\Controllers\Api\PsWorkLogController::class, 'reject']);
        
        Route::get('/change-requests', [\App\Http\Controllers\Api\PsChangeRequestController::class, 'index']);
        Route::post('/change-requests', [\App\Http\Controllers\Api\PsChangeRequestController::class, 'store']);
        Route::post('/change-requests/{id}/approve', [\App\Http\Controllers\Api\PsChangeRequestController::class, 'approve']);
        Route::post('/change-requests/{id}/reject', [\App\Http\Controllers\Api\PsChangeRequestController::class, 'reject']);
        
        Route::get('/bast', [\App\Http\Controllers\Api\PsBastController::class, 'index']);
        Route::post('/project-plans/{id}/generate-bast', [\App\Http\Controllers\Api\PsBastController::class, 'generate']);

        // Task Breakdown routes
        Route::get('estimations/{id}/tasks', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'getTasks']);
        Route::post('estimations/{id}/tasks', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'storeTask'])->middleware('permission:professional_services.edit');
        Route::put('estimations/{id}/tasks/{taskId}', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'updateTask'])->middleware('permission:professional_services.edit');
        Route::delete('estimations/{id}/tasks/{taskId}', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'deleteTask'])->middleware('permission:professional_services.edit');
        Route::post('estimations/{id}/tasks/reorder', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'reorderTasks'])->middleware('permission:professional_services.edit');
        Route::post('estimations/{id}/tasks/recalculate', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'recalculateTasks'])->middleware('permission:professional_services.edit');
        Route::post('estimations/{id}/generate-task-breakdown', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'generateTaskBreakdown'])->middleware('permission:professional_services.edit');
        Route::post('estimations/{id}/apply-task-breakdown', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'applyTaskBreakdown'])->middleware('permission:professional_services.edit');
        
        // Templates
        Route::get('templates', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'indexTemplates']);
        Route::get('templates/{id}', [App\Http\Controllers\Api\ProfessionalServiceController::class, 'showTemplate']);
        // Simplified templates CRUD mapping (Phase 1 focus is the estimator workflow)
    });

    Route::post('quotations/{quotation}/accept', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'acceptQuotation'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/reject', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'rejectQuotation'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/status', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'updateQuotationStatus'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/convert', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'convertToSalesOrder'])->middleware('permission:leads.edit');
    Route::post('quotations/{quotation}/convert-to-sales-order', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'convertToSalesOrder'])->middleware('permission:leads.edit');

    // Lead Order-to-Cash (Sales Orders)
    Route::get('leads/{lead}/sales-orders', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'getSalesOrders'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/sales-orders', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'storeSalesOrder'])->middleware('permission:leads.edit');
    Route::get('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'showSalesOrder'])->middleware('permission:leads.view');
    Route::put('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'updateSalesOrder'])->middleware('permission:leads.edit');
    Route::delete('sales-orders/{order}', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'destroySalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/confirm', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'confirmSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/cancel', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'cancelSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/close', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'closeSalesOrder'])->middleware('permission:leads.edit');
    Route::post('sales-orders/{order}/renew', [\App\Http\Controllers\Api\LeadOrderToCashController::class, 'createRenewalQuotation'])->middleware('permission:leads.edit');

    // Lead Commissions
    Route::get('leads/{lead}/commissions', [\App\Http\Controllers\Api\LeadCommissionController::class, 'index'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/commissions/generate', [\App\Http\Controllers\Api\LeadCommissionController::class, 'generateDraft'])->middleware('permission:leads.edit');
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
    Route::post('leads/{lead}/run-profiling-strategy', [LeadController::class, 'runProfilingStrategy'])->middleware('permission:leads.edit');
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
    Route::put('leads/{lead}/transcripts/{transcript}', [LeadController::class, 'updateTranscript'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/transcripts/fetch-link', [LeadController::class, 'fetchTranscriptFromLink'])->middleware('permission:leads.edit');
    Route::delete('leads/{lead}/transcripts/{transcript}', [LeadController::class, 'deleteTranscript'])->middleware('permission:leads.edit');
    Route::post('leads/{lead}/transcripts/{transcript}/evaluate', [LeadController::class, 'evaluateTranscript'])->middleware('permission:leads.edit');
    Route::get('leads/{lead}/evaluations', [LeadController::class, 'getEvaluations'])->middleware('permission:leads.view');
    Route::get('leads/{lead}/follow-ups', [LeadController::class, 'getFollowUps'])->middleware('permission:leads.view');
    Route::post('leads/{lead}/sync-lark', [\App\Http\Controllers\Api\LarkController::class, 'syncSingleLead'])->middleware('permission:leads.edit');
    
    // Meeting Summary PDFs
    Route::post('transcripts/meeting-summary/generate', [MeetingSummaryPdfController::class, 'generate'])->middleware('permission:leads.edit');
    Route::get('transcripts/{transcript}/meeting-summary/download', [MeetingSummaryPdfController::class, 'download'])->middleware('permission:leads.view');
    
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
 
    // Product Tiers
    Route::get('products/{product}/tiers', [\App\Http\Controllers\Api\ProductTierController::class, 'getTiers']);
    Route::post('products/{product}/tiers', [\App\Http\Controllers\Api\ProductTierController::class, 'storeTier'])->middleware('permission:products.edit');
    Route::put('product-tiers/{id}', [\App\Http\Controllers\Api\ProductTierController::class, 'updateTier'])->middleware('permission:products.edit');
    Route::delete('product-tiers/{id}', [\App\Http\Controllers\Api\ProductTierController::class, 'destroyTier'])->middleware('permission:products.edit');

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

    // O2C Settings: Tax, WHT, and Item settings
    Route::prefix('settings/o2c')->group(function () {
        Route::get('tax-codes', [\App\Http\Controllers\Api\O2CSettingsController::class, 'getTaxCodes']);
        Route::post('tax-codes', [\App\Http\Controllers\Api\O2CSettingsController::class, 'storeTaxCode']);
        Route::put('tax-codes/{id}', [\App\Http\Controllers\Api\O2CSettingsController::class, 'updateTaxCode']);
        Route::delete('tax-codes/{id}', [\App\Http\Controllers\Api\O2CSettingsController::class, 'destroyTaxCode']);
        
        Route::get('withholding-tax-codes', [\App\Http\Controllers\Api\O2CSettingsController::class, 'getWithholdingTaxCodes']);
        Route::post('withholding-tax-codes', [\App\Http\Controllers\Api\O2CSettingsController::class, 'storeWithholdingTaxCode']);
        Route::put('withholding-tax-codes/{id}', [\App\Http\Controllers\Api\O2CSettingsController::class, 'updateWithholdingTaxCode']);
        Route::delete('withholding-tax-codes/{id}', [\App\Http\Controllers\Api\O2CSettingsController::class, 'destroyWithholdingTaxCode']);
        
        Route::get('item-settings', [\App\Http\Controllers\Api\O2CSettingsController::class, 'getItemSettings']);
        Route::put('item-settings', [\App\Http\Controllers\Api\O2CSettingsController::class, 'updateItemSettings']);
    });
 
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

    // WhatsApp — Session (Personal)
    Route::post('whatsapp/session/init', [WhatsAppController::class, 'initSession'])->middleware('permission:whatsapp.personal');
    Route::get('whatsapp/session/status', [WhatsAppController::class, 'status'])->middleware('permission:whatsapp.personal');
    Route::post('whatsapp/session/refresh-qr', [WhatsAppController::class, 'refreshQr'])->middleware('permission:whatsapp.personal');
    Route::post('whatsapp/session/disconnect', [WhatsAppController::class, 'disconnect'])->middleware('permission:whatsapp.personal');

    // WhatsApp — Direct Messaging (Personal)
    Route::post('whatsapp/messages/send', [WhatsAppController::class, 'sendMessage'])->middleware('permission:whatsapp.personal');

    // WhatsApp — Conversations (Personal)
    Route::get('whatsapp/conversations', [WhatsAppController::class, 'getConversations'])->middleware('permission:whatsapp.personal');
    Route::get('whatsapp/conversations/{id}/messages', [WhatsAppController::class, 'getConversationMessages'])->middleware('permission:whatsapp.personal');
    Route::post('whatsapp/conversations/{id}/analyze', [WhatsAppController::class, 'analyzeConversation'])->middleware('permission:whatsapp.personal');
    Route::post('whatsapp/conversations/{id}/convert-to-lead', [WhatsAppController::class, 'convertToLead'])->middleware('permission:whatsapp.personal');
    Route::put('whatsapp/conversations/{id}/meta', [WhatsAppController::class, 'updateMeta'])->middleware('permission:whatsapp.personal');

    // WhatsApp — Settings / Active Users Monitor
    Route::get('settings/whatsapp/active-users', [WhatsAppController::class, 'activeUsers'])->middleware('permission:integrations.manage');
    Route::post('settings/whatsapp/active-users/{userId}/disconnect', [WhatsAppController::class, 'disconnectUser'])->middleware('permission:integrations.manage');

    // WhatsApp — Broadcast Campaigns (Qontak)
    Route::get('whatsapp/campaigns', [WhatsAppController::class, 'listCampaigns'])->middleware('permission:whatsapp.qontak');
    Route::post('whatsapp/campaigns', [WhatsAppController::class, 'createCampaign'])->middleware('permission:whatsapp.qontak');
    Route::post('whatsapp/campaigns/{campaign}/execute', [WhatsAppController::class, 'executeCampaign'])->middleware('permission:whatsapp.qontak');
    Route::put('whatsapp/campaigns/{campaign}', [WhatsAppController::class, 'updateCampaign'])->middleware('permission:whatsapp.qontak');
    Route::delete('whatsapp/campaigns/{campaign}', [WhatsAppController::class, 'destroyCampaign'])->middleware('permission:whatsapp.qontak');

    // WhatsApp — Sync Rules (Qontak)
    Route::get('whatsapp/sync-rules', [WhatsAppController::class, 'getSyncRules'])->middleware('permission:whatsapp.qontak');
    Route::post('whatsapp/sync-rules', [WhatsAppController::class, 'updateSyncRules'])->middleware('permission:whatsapp.qontak');

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
        
        // Advanced Mapping Routes
        Route::get('base/mappings', [LarkController::class, 'getBaseMappings'])->middleware('permission:integrations.manage');
        Route::post('base/mappings', [LarkController::class, 'saveBaseMapping'])->middleware('permission:integrations.manage');
        Route::post('base/mappings/{baseTable}/sync', [LarkController::class, 'syncBaseMapping'])->middleware('permission:integrations.manage');
        Route::delete('base/mappings/{baseTable}', [LarkController::class, 'deleteBaseMapping'])->middleware('permission:integrations.manage');

        // Meeting Summary Output Mappings
        Route::get('meeting-summary/mapping', [LarkController::class, 'getMeetingSummaryMapping'])->middleware('permission:integrations.manage');
        Route::post('meeting-summary/mapping', [LarkController::class, 'saveMeetingSummaryMapping'])->middleware('permission:integrations.manage');
        Route::post('meeting-summary/mapping/test', [LarkController::class, 'testMeetingSummaryMapping'])->middleware('permission:integrations.manage');
    });
});

// ── Lark Webhooks (Public) ──
Route::prefix('webhooks')->group(function () {
    Route::post('lark', [LarkController::class, 'handleWebhook']);
});
