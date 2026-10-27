<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantSsoConfig;
use App\Services\Auth\EnterpriseSsoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EnterpriseSsoController extends Controller
{
    protected EnterpriseSsoService $ssoService;

    public function __construct(EnterpriseSsoService $ssoService)
    {
        $this->ssoService = $ssoService;
    }

    /**
     * Get SSO configurations for a tenant
     */
    public function getConfig(Request $request, int $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $configs = TenantSsoConfig::where('tenant_id', $tenant->id)->get();

        return response()->json([
            'status' => 'success',
            'data' => $configs,
        ]);
    }

    /**
     * Save / Update SSO configuration
     */
    public function saveConfig(Request $request, int $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        $validated = $request->validate([
            'provider' => 'required|string|in:azure_ad,okta,google_workspace,saml_generic',
            'display_name' => 'nullable|string|max:100',
            'client_id' => 'required|string|max:255',
            'client_secret' => 'nullable|string|max:500',
            'issuer_url' => 'nullable|string|max:500',
            'sso_login_url' => 'nullable|string|max:500',
            'entity_id' => 'nullable|string|max:255',
            'domain_whitelist' => 'nullable|array',
            'role_mapping_rules' => 'nullable|array',
            'is_active' => 'boolean',
            'auto_provision_users' => 'boolean',
        ]);

        $dataToSave = [
            'display_name' => $validated['display_name'] ?? ucfirst(str_replace('_', ' ', $validated['provider'])),
            'client_id' => $validated['client_id'],
            'issuer_url' => $validated['issuer_url'] ?? null,
            'sso_login_url' => $validated['sso_login_url'] ?? null,
            'entity_id' => $validated['entity_id'] ?? null,
            'domain_whitelist' => $validated['domain_whitelist'] ?? [],
            'role_mapping_rules' => $validated['role_mapping_rules'] ?? [],
            'is_active' => $validated['is_active'] ?? true,
            'auto_provision_users' => $validated['auto_provision_users'] ?? true,
        ];

        if (!empty($validated['client_secret'])) {
            $dataToSave['client_secret_encrypted'] = encrypt($validated['client_secret']);
        }

        $config = TenantSsoConfig::updateOrCreate(
            ['tenant_id' => $tenant->id, 'provider' => $validated['provider']],
            $dataToSave
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Konfigurasi Enterprise SSO berhasil disimpan.',
            'data' => $config,
        ]);
    }

    /**
     * Test SSO connection
     */
    public function testConnection(Request $request, int $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $provider = $request->input('provider', 'azure_ad');

        $config = TenantSsoConfig::where('tenant_id', $tenant->id)
            ->where('provider', $provider)
            ->firstOrFail();

        $result = $this->ssoService->testConnection($config);

        return response()->json($result);
    }

    /**
     * Get redirect URL for client SSO login button
     */
    public function getLoginUrl(Request $request, string $tenantSlug, string $provider): JsonResponse
    {
        $tenant = Tenant::where('slug', $tenantSlug)->firstOrFail();
        $url = $this->ssoService->getLoginUrl($tenant, $provider);

        return response()->json([
            'status' => 'success',
            'login_url' => $url,
        ]);
    }
}
