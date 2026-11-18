<?php

namespace App\Services\Lark;

use App\Models\LarkIntegration;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LarkAppRegistrationService
{
    protected const DEFAULT_LARK_DOMAIN = 'accounts.larksuite.com';
    protected const DEFAULT_FEISHU_DOMAIN = 'accounts.feishu.cn';
    protected const ENDPOINT = '/oauth/v1/app/registration';

    /**
     * Initiate One-Click Lark App Registration via Device Authorization Grant (RFC 8628).
     */
    public function initiateRegistration(array $options = []): array
    {
        $brand = strtolower($options['brand'] ?? 'lark');
        $domain = $brand === 'feishu' ? self::DEFAULT_FEISHU_DOMAIN : self::DEFAULT_LARK_DOMAIN;
        $baseUrl = "https://{$domain}";

        try {
            $response = Http::asForm()->post("{$baseUrl}" . self::ENDPOINT, [
                'action' => 'begin',
                'archetype' => 'PersonalAgent',
                'auth_method' => 'client_secret',
                'request_user_info' => 'open_id',
            ]);

            if (!$response->successful()) {
                throw new Exception('Lark app registration begin failed: ' . $response->body());
            }

            $data = $response->json();
            $deviceCode = $data['device_code'] ?? null;
            $userCode = $data['user_code'] ?? null;
            $baseUri = $data['verification_uri_complete'] ?? null;
            $expiresIn = (int)($data['expires_in'] ?? 3600);
            $interval = (int)($data['interval'] ?? 5);

            if (!$deviceCode || !$baseUri) {
                throw new Exception('Invalid response from Lark registration begin endpoint: ' . json_encode($data));
            }

            // Define preset permissions required by Leadsy
            $addons = [
                'preset' => false,
                'scopes' => [
                    'tenant' => [
                        'bitable:app',
                        'bitable:app:readonly',
                        'docx:document',
                        'docx:document:readonly',
                        'drive:drive',
                        'drive:drive:readonly',
                        'minutes:minutes:readonly',
                        'minutes:minutes',
                        'vc:meeting:readonly',
                        'vc:recording:readonly',
                        'contact:user.base:readonly',
                        'contact:user.email:readonly',
                        'contact:user.id:readonly',
                        'contact:user.phone:readonly',
                        'contact:user.department:readonly',
                        'auth:user.id:read',
                        'im:message:send_as_bot',
                        'im:chat:readonly',
                        'calendar:calendar',
                        'task:task',
                    ],
                ],
            ];

            $appName = $options['name'] ?? 'Leadsy AI';
            $appDesc = $options['desc'] ?? 'AI-Powered Sales Intelligence & CRM Engine';

            $queryParams = [
                'from' => 'sdk',
                'source' => 'leadsy',
                'tp' => 'sdk',
                'name' => $appName,
                'desc' => $appDesc,
                'createOnly' => 'true',
                'addons' => self::encodeAddons($addons),
            ];

            $separator = str_contains($baseUri, '?') ? '&' : '?';
            $verificationUrl = $baseUri . $separator . http_build_query($queryParams);

            // Cache registration session
            $sessionData = [
                'device_code' => $deviceCode,
                'user_code' => $userCode,
                'brand' => $brand,
                'tenant_id' => $options['tenant_id'] ?? null,
                'user_id' => $options['user_id'] ?? null,
                'is_new_tenant' => empty($options['tenant_id']),
                'created_at' => now()->timestamp,
            ];

            Cache::put("lark_app_reg:{$deviceCode}", $sessionData, now()->addSeconds($expiresIn));

            return [
                'success' => true,
                'device_code' => $deviceCode,
                'user_code' => $userCode,
                'verification_url' => $verificationUrl,
                'expires_in' => $expiresIn,
                'interval' => $interval ?: 5,
            ];
        } catch (Exception $e) {
            Log::error('LarkAppRegistrationService initiate failed', [
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Poll status of app registration.
     */
    public function pollStatus(string $deviceCode): array
    {
        $session = Cache::get("lark_app_reg:{$deviceCode}");
        if (!$session) {
            return [
                'status' => 'expired',
                'message' => 'Registration session expired or invalid. Please start again.',
            ];
        }

        $brand = $session['brand'] ?? 'lark';
        $domain = $brand === 'feishu' ? self::DEFAULT_FEISHU_DOMAIN : self::DEFAULT_LARK_DOMAIN;
        $baseUrl = "https://{$domain}";

        try {
            $response = Http::asForm()->post("{$baseUrl}" . self::ENDPOINT, [
                'action' => 'poll',
                'device_code' => $deviceCode,
            ]);

            $statusCode = $response->status();
            $data = $response->json() ?? [];

            // 1. Success check: credentials returned
            if (!empty($data['client_id']) && !empty($data['client_secret'])) {
                $clientId = $data['client_id'];
                $clientSecret = $data['client_secret'];
                $userInfo = $data['user_info'] ?? [];

                $result = $this->finalizeRegistration($session, $clientId, $clientSecret, $userInfo);
                Cache::forget("lark_app_reg:{$deviceCode}");

                return array_merge([
                    'status' => 'success',
                    'app_id' => $clientId,
                ], $result);
            }

            // 2. Pending / Slow Down check
            $err = $data['error'] ?? '';
            if ($err === 'authorization_pending' || $statusCode === 400 && $err === 'authorization_pending') {
                return [
                    'status' => 'pending',
                    'message' => 'Waiting for user authorization in Lark...',
                ];
            }

            if ($err === 'slow_down') {
                return [
                    'status' => 'slow_down',
                    'interval' => 10,
                ];
            }

            if ($err === 'access_denied') {
                Cache::forget("lark_app_reg:{$deviceCode}");
                return [
                    'status' => 'denied',
                    'message' => 'User rejected the app creation request in Lark.',
                ];
            }

            if ($err === 'expired_token') {
                Cache::forget("lark_app_reg:{$deviceCode}");
                return [
                    'status' => 'expired',
                    'message' => 'Authorization code expired.',
                ];
            }

            return [
                'status' => 'pending',
                'message' => $data['error_description'] ?? 'Authorizing...',
            ];
        } catch (Exception $e) {
            Log::warning('Lark app registration poll encountered error', [
                'error' => $e->getMessage(),
            ]);

            return [
                'status' => 'pending',
                'message' => 'Connecting to Lark...',
            ];
        }
    }

    /**
     * Finalize registration: associate credentials with tenant and user.
     */
    protected function finalizeRegistration(array $session, string $clientId, string $clientSecret, array $userInfo = []): array
    {
        $tenantId = $session['tenant_id'] ?? null;
        $userId = $session['user_id'] ?? null;
        $token = null;
        $user = null;

        if ($tenantId) {
            // Existing tenant (e.g. triggered from Settings -> Integrations -> Lark)
            $tenant = Tenant::findOrFail($tenantId);
        } else {
            // New company/user self-registering from Landing Page or Login
            $openId = $userInfo['open_id'] ?? null;
            $companyName = 'Lark Workspace ' . substr($clientId, -6);

            // Attempt to query tenant details using the new app credentials
            $tenantDetails = $this->queryTenantDetails($clientId, $clientSecret);
            if (!empty($tenantDetails['name'])) {
                $companyName = $tenantDetails['name'];
            }

            $tenant = Tenant::create([
                'name' => $companyName,
                'slug' => \Illuminate\Support\Str::slug($companyName) . '-' . substr(uniqid(), -4),
                'is_active' => true,
            ]);
            $tenantId = $tenant->id;

            // Provision initial super_admin or sales_exec user for this tenant
            $adminRole = Role::where('name', 'super_admin')->first() ?: Role::where('name', 'sales_director')->first();
            $adminEmail = 'admin@' . \Illuminate\Support\Str::slug($companyName) . '.leadsy.local';
            
            // Create user
            $user = User::create([
                'name' => $companyName . ' Admin',
                'email' => $adminEmail,
                'tenant_id' => $tenantId,
                'password' => bcrypt(bin2hex(random_bytes(16))),
                'email_verified_at' => now(),
                'role_id' => $adminRole?->id,
                'is_active' => true,
            ]);

            $newAccessToken = $user->createToken('api');
            $token = $newAccessToken->plainTextToken;
        }

        // Save or update LarkIntegration for this tenant
        $integration = LarkIntegration::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'app_id' => $clientId,
                'app_secret_encrypted' => encrypt($clientSecret),
                'is_active' => true,
                'enabled_modules' => ['sso', 'bitable', 'meeting', 'drive', 'messenger', 'calendar', 'tasks'],
            ]
        );

        Log::info('One-Click Lark App Registration completed successfully', [
            'tenant_id' => $tenantId,
            'app_id' => $clientId,
            'integration_id' => $integration->id,
        ]);

        return [
            'tenant_id' => $tenantId,
            'tenant_name' => $tenant->name ?? 'Lark Workspace',
            'token' => $token,
            'user' => $user ? $user->load('role.permissions') : null,
            'redirect' => '/dashboard',
        ];
    }

    /**
     * Query tenant details using internal tenant_access_token.
     */
    protected function queryTenantDetails(string $appId, string $appSecret): ?array
    {
        try {
            $resp = Http::post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', [
                'app_id' => $appId,
                'app_secret' => $appSecret,
            ]);

            if (!$resp->successful()) {
                return null;
            }

            $tokenData = $resp->json();
            $tenantToken = $tokenData['tenant_access_token'] ?? null;
            if (!$tenantToken) {
                return null;
            }

            $tenantQuery = Http::withHeaders([
                'Authorization' => "Bearer {$tenantToken}",
            ])->get('https://open.larksuite.com/open-apis/tenant/v2/tenant/query');

            if ($tenantQuery->successful()) {
                $res = $tenantQuery->json();
                return $res['data']['tenant'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to query Lark tenant details: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Encodes addons according to Lark Open Platform specifications:
     * JSON.stringify -> gzip -> base64 -> URL-safe ('+' -> '-', '/' -> '_') -> strip '=' padding.
     */
    public static function encodeAddons(array $addons): string
    {
        $json = json_encode($addons, JSON_UNESCAPED_SLASHES);
        $gzipped = gzencode($json, 9);
        $base64 = base64_encode($gzipped);
        $urlSafe = strtr($base64, '+/', '-_');

        return rtrim($urlSafe, '=');
    }
}
