<?php

namespace App\Services\Lark;

use App\Models\LarkIntegration;
use App\Models\LarkSsoUser;
use App\Models\Role;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class LarkSsoService
{
    protected LarkIntegration $integration;
    protected string $appId;
    protected string $appSecret;
    protected array $openApiBaseUrls = [];
    protected string $accountsBaseUrl;

    public function __construct(LarkIntegration $integration)
    {
        $this->integration = $integration;
        $this->appId = $integration->app_id;
        $this->appSecret = decrypt($integration->app_secret_encrypted);
        $this->openApiBaseUrls = $this->resolveOpenApiBaseUrls();
        $this->accountsBaseUrl = rtrim(env('LARK_ACCOUNTS_BASE_URL', 'https://accounts.larksuite.com'), '/');
    }

    protected function resolveOpenApiBaseUrls(): array
    {
        $configured = env('LARK_OPEN_API_BASE_URLS', env('LARK_OPEN_API_BASE_URL'));
        $urls = $configured
            ? array_map('trim', explode(',', $configured))
            : [
                'https://open.larksuite.com/open-apis',
                'https://open.larkoffice.com/open-apis',
            ];

        return array_values(array_filter(array_map(
            fn (string $url) => rtrim($url, '/'),
            $urls
        )));
    }

    /**
     * Get OAuth2 authorization URL
     */
    public function getAuthorizationUrl(string $redirectUri, string $state, ?string $scope = null): string
    {
        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => $state,
        ];

        if ($scope) {
            $params['scope'] = $scope;
        }

        return $this->accountsBaseUrl . '/open-apis/authen/v1/authorize?' . http_build_query($params);
    }

    /**
     * Exchange authorization code for user info
     */
    public function handleCallback(string $code, string $redirectUri): ?array
    {
        try {
            $lastError = null;
            $data = null;

            foreach ($this->openApiBaseUrls as $baseUrl) {
                try {
                    $response = Http::withHeaders([
                        'Content-Type' => 'application/json; charset=utf-8',
                    ])->post($baseUrl . '/authen/v2/oauth/token', [
                        'grant_type' => 'authorization_code',
                        'client_id' => $this->appId,
                        'client_secret' => $this->appSecret,
                        'code' => $code,
                        'redirect_uri' => $redirectUri,
                    ]);

                    if (!$response->successful()) {
                        throw new Exception('Failed to get access token: ' . $response->body());
                    }

                    $data = $response->json();
                    break;
                } catch (Exception $e) {
                    $lastError = $e;
                    Log::warning('Lark OAuth token endpoint failed', [
                        'base_url' => $baseUrl,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if (!$data) {
                throw $lastError ?: new Exception('Failed to get Lark user access token');
            }

            if ((string) ($data['code'] ?? '1') !== '0') {
                throw new Exception('Lark API error: ' . ($data['error_description'] ?? $data['msg'] ?? 'Unknown error'));
            }

            $accessToken = $data['access_token'] ?? null;
            if (!$accessToken) {
                throw new Exception('Lark user_access_token missing from token response');
            }

            $userInfo = $this->getUserInfo($accessToken);

            return [
                'success' => true,
                'user_info' => $userInfo,
                'access_token' => $accessToken,
                'refresh_token' => $data['refresh_token'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Lark SSO callback failed', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get user info from Lark
     */
    protected function getUserInfo(string $accessToken): ?array
    {
        try {
            $lastError = null;

            foreach ($this->openApiBaseUrls as $baseUrl) {
                try {
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $accessToken,
                    ])->get($baseUrl . '/authen/v1/user_info');

                    if (!$response->successful()) {
                        throw new Exception('Failed to get user info: ' . $response->body());
                    }

                    $data = $response->json();

                    if ((string) ($data['code'] ?? '1') !== '0') {
                        throw new Exception('Lark API error: ' . ($data['msg'] ?? 'Unknown error'));
                    }

                    return $data['data'] ?? null;
                } catch (Exception $e) {
                    $lastError = $e;
                    Log::warning('Lark user info endpoint failed', [
                        'base_url' => $baseUrl,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            throw $lastError ?: new Exception('Failed to get Lark user info');
        } catch (Exception $e) {
            Log::error('Failed to get Lark user info', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Link Lark user to Leadsy user
     */
    public function linkUser(User $user, array $larkUserInfo): LarkSsoUser
    {
        $ssoUser = LarkSsoUser::firstOrCreate(
            [
                'lark_user_id' => $larkUserInfo['user_id'],
                'tenant_id' => $user->tenant_id,
            ],
            [
                'user_id' => $user->id,
                'lark_union_id' => $larkUserInfo['union_id'] ?? null,
                'lark_email' => $larkUserInfo['email'] ?? null,
                'lark_name' => $larkUserInfo['name'] ?? null,
                'lark_mobile' => $larkUserInfo['mobile'] ?? null,
                'lark_avatar_url' => $larkUserInfo['avatar']['avatar_url'] ?? null,
                'lark_department_id' => $larkUserInfo['department_id'] ?? null,
            ]
        );

        Log::info('Lark user linked to Leadsy user', [
            'user_id' => $user->id,
            'lark_user_id' => $larkUserInfo['user_id'],
        ]);

        return $ssoUser;
    }

    /**
     * Create or update user from Lark SSO
     */
    public function createOrUpdateUserFromLark(
        array $larkUserInfo,
        Tenant $tenant,
        ?string $role = null
    ): User {
        $email = $larkUserInfo['email'] ?? null;
        $name = $larkUserInfo['name'] ?? 'Lark User';

        if (!$email) {
            throw new Exception('Email not provided by Lark');
        }

        $roleModel = $role ? Role::where('name', $role)->first() : null;

        // Find or create user. The default role is only applied during first SSO provisioning;
        // later admin-managed role changes must remain authoritative.
        $user = User::firstOrCreate(
            [
                'email' => $email,
                'tenant_id' => $tenant->id,
            ],
            [
                'name' => $name,
                'password' => bcrypt(bin2hex(random_bytes(16))), // Random password
                'email_verified_at' => now(),
                'role_id' => $roleModel?->id,
            ]
        );

        $updates = [];

        if ($user->name !== $name) {
            $updates['name'] = $name;
        }

        if (!$user->email_verified_at) {
            $updates['email_verified_at'] = now();
        }

        if (!$user->role_id && $roleModel) {
            $updates['role_id'] = $roleModel->id;
        }

        if ($updates) {
            $user->update($updates);
        }

        // Link SSO user
        $this->linkUser($user, $larkUserInfo);

        // Try to link direct manager if available
        if (isset($larkUserInfo['manager_id'])) {
            $this->linkDirectManager($user, $larkUserInfo['manager_id']);
        }

        Log::info('User created/updated from Lark SSO', [
            'user_id' => $user->id,
            'email' => $email,
        ]);

        return $user;
    }

    /**
     * Link direct manager from Lark
     */
    public function linkDirectManager(User $user, string $larkManagerId): void
    {
        try {
            // Find user by Lark manager ID
            $managerSsoUser = LarkSsoUser::where('lark_user_id', $larkManagerId)
                ->where('tenant_id', $user->tenant_id)
                ->first();

            if ($managerSsoUser) {
                $user->update([
                    'direct_manager_id' => $managerSsoUser->user_id,
                ]);

                Log::info('Direct manager linked for Lark SSO user', [
                    'user_id' => $user->id,
                    'manager_id' => $managerSsoUser->user_id,
                ]);
            }
        } catch (Exception $e) {
            Log::error('Failed to link direct manager', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get department info from Lark
     */
    public function getDepartment(string $departmentId, string $accessToken): ?array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
            ])->get($this->openApiBaseUrls[0] . '/contact/v3/departments/' . $departmentId);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            if ((string) ($data['code'] ?? '1') !== '0') {
                return null;
            }

            return $data['data']['department'] ?? null;
        } catch (Exception $e) {
            Log::error('Failed to get Lark department', [
                'department_id' => $departmentId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
