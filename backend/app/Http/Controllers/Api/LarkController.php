<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LarkIntegration;
use App\Models\LarkEvent;
use App\Services\Lark\LarkService;
use App\Services\Lark\LarkMessengerService;
use App\Services\Lark\LarkTaskService;
use App\Services\Lark\LarkCalendarService;
use App\Services\Lark\LarkMeetingService;
use App\Services\Lark\LarkBaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Exception;

class LarkController extends Controller
{
    /**
     * Get Lark integration config
     */
    public function getConfig(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (!$integration) {
            return response()->json([
                'configured' => false,
                'message' => 'Lark integration not configured',
            ]);
        }

        return response()->json([
            'configured' => true,
            'is_active' => $integration->is_active,
            'app_id' => $integration->app_id,
            'has_app_secret' => (bool) $integration->app_secret_encrypted,
            'has_verification_token' => (bool) $integration->verification_token_encrypted,
            'has_encrypt_key' => (bool) $integration->encrypt_key_encrypted,
            'base_url' => $integration->base_url,
            'enabled_modules' => $integration->enabled_modules ?? [],
            'last_sync_at' => $integration->last_sync_at,
        ]);
    }

    /**
     * Save Lark integration config
     */
    public function saveConfig(Request $request)
    {
        $request->validate([
            'app_id' => 'required|string',
            'app_secret' => 'nullable|string',
            'verification_token' => 'nullable|string',
            'encrypt_key' => 'nullable|string',
            'base_url' => 'nullable|url',
            'enabled_modules' => 'array',
        ]);

        $user = Auth::user();
        $tenantId = $user->tenant_id;


        $existingIntegration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (!$existingIntegration && !$request->filled('app_secret')) {
            return response()->json([
                'success' => false,
                'message' => 'App Secret is required when creating Lark configuration.',
            ], 400);
        }

        $appSecretEncrypted = $request->filled('app_secret')
            ? encrypt($request->app_secret)
            : ($existingIntegration?->app_secret_encrypted ?? null);

        try {
            $integration = LarkIntegration::updateOrCreate(
                ['tenant_id' => $tenantId],
                [
                    'app_id' => $request->app_id,
                    'app_secret_encrypted' => $appSecretEncrypted,
                    'verification_token_encrypted' => $request->verification_token 
                        ? encrypt($request->verification_token) 
                        : ($existingIntegration?->verification_token_encrypted ?? null),
                    'encrypt_key_encrypted' => $request->encrypt_key 
                        ? encrypt($request->encrypt_key) 
                        : ($existingIntegration?->encrypt_key_encrypted ?? null),
                    'base_url' => $request->base_url,
                    'enabled_modules' => $request->enabled_modules ?? ($existingIntegration->enabled_modules ?? []),
                ]
            );

            // Test connection
            $larkService = new LarkService($integration);
            $testResult = $larkService->testConnection();

            if ($testResult['success']) {
                $integration->update(['is_active' => true]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Lark integration configured and verified',
                    'integration' => $integration,
                ]);
            } else {
                $error = $testResult['error'] ?? 'Unknown Lark connection error';

                return response()->json([
                    'success' => false,
                    'message' => 'Connection test failed: ' . $error,
                    'error' => $error,
                ], 400);
            }
        } catch (Exception $e) {
            Log::error('Failed to save Lark config', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to save Lark integration: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test Lark connection
     */
    public function testConnection(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;


        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (!$integration) {
            return response()->json([
                'success' => false,
                'message' => 'Lark integration not configured',
            ], 400);
        }

        try {
            $larkService = new LarkService($integration);
            $result = $larkService->testConnection();

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enable/disable Lark module
     */
    public function toggleModule(Request $request)
    {
        $request->validate([
            'module' => 'required|in:messenger,meeting,calendar,task,base,sso',
            'enabled' => 'required|boolean',
        ]);

        $user = Auth::user();
        $tenantId = $user->tenant_id;


        $integration = LarkIntegration::where('tenant_id', $tenantId)->firstOrFail();

        if ($request->enabled) {
            $integration->enableModule($request->module);
        } else {
            $integration->disableModule($request->module);
        }

        Log::info('Lark module toggled', [
            'module' => $request->module,
            'enabled' => $request->enabled,
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($request->module) . ' module ' . ($request->enabled ? 'enabled' : 'disabled'),
            'enabled_modules' => $integration->enabled_modules,
        ]);
    }

    /**
     * Get Lark sync history
     */
    public function getSyncHistory(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;


        $syncs = \App\Models\LarkSync::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json([
            'data' => $syncs,
        ]);
    }

    /**
     * Get Lark event log
     */
    public function getEventLog(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;


        $events = LarkEvent::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json([
            'data' => $events,
        ]);
    }

    /**
     * Webhook endpoint for Lark events
     */
    public function handleWebhook(Request $request)
    {
        try {
            $payload = $request->all();

            Log::info('Received Lark webhook', [
                'payload' => $payload,
            ]);

            // Find integration by app_id
            $appId = $payload['app_id'] ?? null;
            $integration = LarkIntegration::where('app_id', $appId)->firstOrFail();

            // Create event record
            $event = LarkEvent::create([
                'tenant_id' => $integration->tenant_id,
                'lark_integration_id' => $integration->id,
                'event_type' => $payload['type'] ?? 'unknown',
                'lark_entity_type' => $payload['event']['entity_type'] ?? null,
                'lark_entity_id' => $payload['event']['entity_id'] ?? null,
                'event_data' => $payload['event'] ?? null,
                'status' => 'received',
            ]);

            // Dispatch to queue for processing
            \App\Jobs\ProcessLarkWebhookEvent::dispatch($event);

            return response()->json([
                'code' => 0,
                'msg' => 'success',
            ]);
        } catch (Exception $e) {
            Log::error('Lark webhook handling failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'code' => -1,
                'msg' => 'error',
            ], 500);
        }
    }

    /**
     * Get Lark integration status
     */
    public function getStatus(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (!$integration) {
            return response()->json([
                'configured' => false,
            ]);
        }

        return response()->json([
            'configured' => true,
            'is_active' => $integration->is_active,
            'enabled_modules' => $integration->enabled_modules ?? [],
            'last_sync_at' => $integration->last_sync_at,
            'sync_status' => $integration->sync_status,
        ]);
    }
}
