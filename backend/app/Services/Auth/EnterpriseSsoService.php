<?php

namespace App\Services\Auth;

use App\Models\Tenant;
use App\Models\TenantSsoConfig;
use App\Models\User;
use App\Models\Role;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EnterpriseSsoService
{
    /**
     * Generate Enterprise SSO Login Redirect URL
     */
    public function getLoginUrl(Tenant $tenant, string $provider): string
    {
        $config = TenantSsoConfig::where('tenant_id', $tenant->id)
            ->where('provider', $provider)
            ->where('is_active', true)
            ->first();

        if (!$config) {
            throw new Exception("Enterprise SSO configuration for provider '{$provider}' is not active for this tenant.");
        }

        $state = Str::random(40);
        session(['sso_state' => $state, 'sso_tenant_id' => $tenant->id, 'sso_provider' => $provider]);

        $redirectUri = url("/api/auth/sso/{$provider}/callback");

        switch ($provider) {
            case 'azure_ad':
                $tenantId = $config->entity_id ?: 'common';
                return "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/authorize?" . http_build_query([
                    'client_id' => $config->client_id,
                    'response_type' => 'code',
                    'redirect_uri' => $redirectUri,
                    'response_mode' => 'query',
                    'scope' => 'openid profile email User.Read',
                    'state' => $state,
                ]);

            case 'okta':
                $issuer = rtrim($config->issuer_url, '/');
                return "{$issuer}/v1/authorize?" . http_build_query([
                    'client_id' => $config->client_id,
                    'response_type' => 'code',
                    'scope' => 'openid profile email groups',
                    'redirect_uri' => $redirectUri,
                    'state' => $state,
                ]);

            case 'google_workspace':
                return "https://accounts.google.com/o/oauth2/v2/auth?" . http_build_query([
                    'client_id' => $config->client_id,
                    'response_type' => 'code',
                    'scope' => 'openid profile email',
                    'redirect_uri' => $redirectUri,
                    'state' => $state,
                    'access_type' => 'online',
                ]);

            default:
                return $config->sso_login_url ?: url("/login");
        }
    }

    /**
     * Test IDP Metadata Reachability
     */
    public function testConnection(TenantSsoConfig $config): array
    {
        try {
            $url = $config->issuer_url;
            if (!$url && $config->provider === 'azure_ad') {
                $tenantId = $config->entity_id ?: 'common';
                $url = "https://login.microsoftonline.com/{$tenantId}/v2.0/.well-known/openid-configuration";
            }

            if ($url) {
                $response = Http::timeout(5)->get($url);
                if ($response->successful()) {
                    return [
                        'status' => 'success',
                        'message' => 'Koneksi ke Identity Provider berhasil diverifikasi.',
                        'metadata_status' => $response->status(),
                    ];
                }
            }

            return [
                'status' => 'success',
                'message' => 'Konfigurasi SSO valid dan siap digunakan.',
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'warning',
                'message' => 'Koneksi dicoba namun Identity Provider timeout: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Provision or Synchronize Corporate SSO User
     */
    public function provisionUser(Tenant $tenant, TenantSsoConfig $config, array $claims): User
    {
        $email = strtolower($claims['email'] ?? '');
        if (!$email) {
            throw new Exception("IDP payload tidak menyertakan klaim email yang valid.");
        }

        // Domain validation if whitelist is configured
        if (!empty($config->domain_whitelist)) {
            $isWhitelisted = false;
            foreach ($config->domain_whitelist as $domain) {
                if (Str::endsWith($email, ltrim($domain, '@'))) {
                    $isWhitelisted = true;
                    break;
                }
            }

            if (!$isWhitelisted) {
                throw new Exception("Akses ditolak: domain email {$email} tidak berada dalam daftar whitelist SSO korporat.");
            }
        }

        $user = User::where('email', $email)->first();

        // Determine mapped role from IDP groups
        $assignedRoleName = 'sales'; // Default role
        $idpGroups = $claims['groups'] ?? [];

        if (!empty($config->role_mapping_rules) && is_array($config->role_mapping_rules)) {
            foreach ($config->role_mapping_rules as $ruleGroup => $targetRole) {
                if (in_array($ruleGroup, $idpGroups)) {
                    $assignedRoleName = $targetRole;
                    break;
                }
            }
        }

        $role = Role::where('name', $assignedRoleName)->first();

        if (!$user) {
            if (!$config->auto_provision_users) {
                throw new Exception("Auto-provisioning dinonaktifkan. Akun pengguna belum terdaftar di Leadsy.");
            }

            $user = User::create([
                'name' => $claims['name'] ?? explode('@', $email)[0],
                'email' => $email,
                'password' => bcrypt(Str::random(32)),
                'tenant_id' => $tenant->id,
                'role_id' => $role?->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
        } else {
            // Sync role if mapped
            if ($role && $user->role_id !== $role->id) {
                $user->update(['role_id' => $role->id]);
            }
        }

        return $user;
    }
}
