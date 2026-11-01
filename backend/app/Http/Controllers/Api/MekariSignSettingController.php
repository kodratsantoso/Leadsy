<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use App\Models\Tenant;
use App\Services\AuditService;
use App\Services\Integration\MekariSignService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MekariSignSettingController extends Controller
{
    protected MekariSignService $mekariSignService;

    public function __construct(MekariSignService $mekariSignService)
    {
        $this->mekariSignService = $mekariSignService;
    }

    private function resolveTenant(Request $request): ?Tenant
    {
        return $request->user()?->tenant ?? auth('sanctum')->user()?->tenant;
    }

    /**
     * Retrieve Mekari Sign settings and entitlement privilege for the current tenant.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        $hasPrivilege = $tenant ? $tenant->hasModule('mekari_sign') : false;

        if (!$hasPrivilege) {
            return response()->json([
                'success' => true,
                'data' => [
                    'has_privilege' => false,
                    'is_active' => false,
                    'is_sandbox' => true,
                    'client_id' => '',
                    'has_secret' => false,
                    'auto_meterai' => false,
                    'webhook_url' => config('app.url') . '/api/webhooks/mekari-sign',
                    'message' => 'Paket integrasi Mekari Sign belum diaktifkan oleh Administrator SaaS untuk workspace Anda.',
                ],
            ]);
        }

        $tenantId = $tenant->id;
        $configs = IntegrationConfig::query()
            ->where('category', 'mekari_sign')
            ->where('tenant_id', $tenantId)
            ->get()
            ->keyBy('key');

        $isActive = $configs->has('MEKARI_SIGN_ENABLED') ? (bool) $configs['MEKARI_SIGN_ENABLED']->value : false;
        $isSandbox = $configs->has('MEKARI_SIGN_SANDBOX') ? (bool) $configs['MEKARI_SIGN_SANDBOX']->value : true;
        $clientId = $configs->has('MEKARI_SIGN_CLIENT_ID') ? (string) $configs['MEKARI_SIGN_CLIENT_ID']->value : '';
        $hasSecret = $configs->has('MEKARI_SIGN_CLIENT_SECRET') && !empty($configs['MEKARI_SIGN_CLIENT_SECRET']->value);
        $autoMeterai = $configs->has('MEKARI_SIGN_AUTO_EMETERAI') ? (bool) $configs['MEKARI_SIGN_AUTO_EMETERAI']->value : false;

        return response()->json([
            'success' => true,
            'data' => [
                'has_privilege' => true,
                'is_active' => $isActive,
                'is_sandbox' => $isSandbox,
                'client_id' => $clientId,
                'has_secret' => $hasSecret,
                'auto_meterai' => $autoMeterai,
                'webhook_url' => config('app.url') . '/api/webhooks/mekari-sign',
                'message' => 'Paket integrasi aktif. Anda dapat mengonfigurasi kredensial Mekari Sign.',
            ],
        ]);
    }

    /**
     * Save Mekari Sign credentials and preferences for the current tenant.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        $hasPrivilege = $tenant ? $tenant->hasModule('mekari_sign') : false;

        if (!$hasPrivilege) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Paket integrasi Mekari Sign belum diaktifkan oleh Administrator SaaS untuk workspace Anda.',
            ], 403);
        }

        $validated = $request->validate([
            'is_active' => 'required|boolean',
            'is_sandbox' => 'required|boolean',
            'client_id' => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:255',
            'auto_meterai' => 'required|boolean',
        ]);

        $tenantId = $tenant->id;

        // 1. MEKARI_SIGN_ENABLED
        IntegrationConfig::updateOrCreate(
            ['tenant_id' => $tenantId, 'category' => 'mekari_sign', 'key' => 'MEKARI_SIGN_ENABLED'],
            ['value' => $validated['is_active'] ? '1' : '0', 'value_type' => 'boolean', 'is_secret' => false, 'is_active' => true]
        );

        // 2. MEKARI_SIGN_SANDBOX
        IntegrationConfig::updateOrCreate(
            ['tenant_id' => $tenantId, 'category' => 'mekari_sign', 'key' => 'MEKARI_SIGN_SANDBOX'],
            ['value' => $validated['is_sandbox'] ? '1' : '0', 'value_type' => 'boolean', 'is_secret' => false, 'is_active' => true]
        );

        // 3. MEKARI_SIGN_CLIENT_ID
        IntegrationConfig::updateOrCreate(
            ['tenant_id' => $tenantId, 'category' => 'mekari_sign', 'key' => 'MEKARI_SIGN_CLIENT_ID'],
            ['value' => $validated['client_id'] ?? '', 'value_type' => 'string', 'is_secret' => false, 'is_active' => true]
        );

        // 4. MEKARI_SIGN_CLIENT_SECRET (only update if provided)
        if (!empty($validated['client_secret'])) {
            IntegrationConfig::updateOrCreate(
                ['tenant_id' => $tenantId, 'category' => 'mekari_sign', 'key' => 'MEKARI_SIGN_CLIENT_SECRET'],
                ['value' => $validated['client_secret'], 'value_type' => 'string', 'is_secret' => true, 'is_active' => true]
            );
        }

        // 5. MEKARI_SIGN_AUTO_EMETERAI
        IntegrationConfig::updateOrCreate(
            ['tenant_id' => $tenantId, 'category' => 'mekari_sign', 'key' => 'MEKARI_SIGN_AUTO_EMETERAI'],
            ['value' => $validated['auto_meterai'] ? '1' : '0', 'value_type' => 'boolean', 'is_secret' => false, 'is_active' => true]
        );

        AuditService::log('update', 'mekari_sign_settings', $tenant);

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan Mekari Sign berhasil disimpan.',
        ]);
    }

    /**
     * Test live OAuth connection to Mekari Sign API.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        $hasPrivilege = $tenant ? $tenant->hasModule('mekari_sign') : false;

        if (!$hasPrivilege) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Paket integrasi Mekari Sign belum diaktifkan oleh Administrator SaaS.',
            ], 403);
        }

        $clientId = $request->input('client_id');
        $clientSecret = $request->input('client_secret');
        $isSandbox = $request->has('is_sandbox') ? (bool) $request->input('is_sandbox') : null;

        // If client_secret is omitted, try using existing saved secret
        if (empty($clientSecret) && $tenant) {
            $existingSecret = IntegrationConfig::where('tenant_id', $tenant->id)
                ->where('category', 'mekari_sign')
                ->where('key', 'MEKARI_SIGN_CLIENT_SECRET')
                ->first();
            $clientSecret = $existingSecret?->value;
        }

        if (empty($clientId) && $tenant) {
            $existingId = IntegrationConfig::where('tenant_id', $tenant->id)
                ->where('category', 'mekari_sign')
                ->where('key', 'MEKARI_SIGN_CLIENT_ID')
                ->first();
            $clientId = $existingId?->value;
        }

        try {
            $service = $this->mekariSignService->forTenant($tenant);
            $result = $service->testConnection($clientId, $clientSecret, $isSandbox);

            return response()->json($result, $result['success'] ? 200 : 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Uji koneksi gagal: ' . $e->getMessage(),
            ], 422);
        }
    }
}
