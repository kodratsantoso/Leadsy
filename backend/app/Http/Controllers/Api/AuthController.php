<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationOtp;
use App\Models\LarkIntegration;
use App\Models\Role;
use App\Models\SecuritySetting;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Lark\LarkSsoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public const ROUND1_MAX_ATTEMPTS = 3;
    public const ROUND1_LOCKOUT_SECONDS = 600; // 10 minutes
    public const ROUND2_MAX_ATTEMPTS = 3;

    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($request->email));

        // 1. Check if user exists and is already suspended / inactive
        $user = User::where('email', $email)->first();
        if ($user && ! $user->is_active) {
            return response()->json([
                'status' => 'account_suspended',
                'message' => 'Akun Anda telah ditangguhkan (suspended) atau dinonaktifkan. Silakan hubungi Administrator untuk memulihkan akses Anda.',
            ], 403);
        }

        // 2. Check if currently in Round 1 Lockout (10 minutes)
        $lockoutUntil = Cache::get("login_lockout:round1:{$email}");
        if ($lockoutUntil && $lockoutUntil > now()->timestamp) {
            $diffSeconds = (int) ($lockoutUntil - now()->timestamp);
            $minutes = (int) ceil($diffSeconds / 60);

            return response()->json([
                'status' => 'temporarily_locked',
                'message' => "Terlalu banyak percobaan login gagal. Akun Anda dikunci sementara selama 10 menit. Silakan coba lagi dalam {$minutes} menit.",
                'retry_after_seconds' => $diffSeconds,
            ], 429);
        }

        // 3. Verify credentials
        if (! $user || ! Hash::check($request->password, $user->password)) {
            AuditService::logFailedLogin($email);

            $currentRound = (int) Cache::get("login_round:{$email}", 1);

            if ($currentRound === 1) {
                $attempts = (int) Cache::get("login_attempts:round1:{$email}", 0) + 1;
                Cache::put("login_attempts:round1:{$email}", $attempts, now()->addHours(24));

                if ($attempts < self::ROUND1_MAX_ATTEMPTS) {
                    $remaining = self::ROUND1_MAX_ATTEMPTS - $attempts;

                    return response()->json([
                        'status' => 'invalid_credentials',
                        'message' => "Email atau password tidak sesuai. Sisa percobaan: {$remaining} kali sebelum akun dikunci sementara selama 10 menit.",
                        'attempts_left' => $remaining,
                        'round' => 1,
                    ], 401);
                }

                // 3rd failure in Round 1: Trigger 10-minute lockout and advance to Round 2
                $lockoutTarget = now()->addSeconds(self::ROUND1_LOCKOUT_SECONDS)->timestamp;
                Cache::put("login_lockout:round1:{$email}", $lockoutTarget, self::ROUND1_LOCKOUT_SECONDS);
                Cache::put("login_round:{$email}", 2, now()->addHours(24));

                return response()->json([
                    'status' => 'temporarily_locked',
                    'message' => 'Anda telah gagal login sebanyak 3 kali. Demi keamanan akun, Anda dikunci sementara selama 10 menit.',
                    'retry_after_seconds' => self::ROUND1_LOCKOUT_SECONDS,
                    'round' => 1,
                ], 429);
            }

            // Current round is 2 (after the 10-minute cooldown has passed)
            $attempts = (int) Cache::get("login_attempts:round2:{$email}", 0) + 1;
            Cache::put("login_attempts:round2:{$email}", $attempts, now()->addHours(24));

            if ($attempts < self::ROUND2_MAX_ATTEMPTS) {
                $remaining = self::ROUND2_MAX_ATTEMPTS - $attempts;

                return response()->json([
                    'status' => 'invalid_credentials',
                    'message' => "Email atau password tidak sesuai (Percobaan Tahap ke-2). Sisa percobaan: {$remaining} kali sebelum akun Anda ditangguhkan (suspended) secara permanen.",
                    'attempts_left' => $remaining,
                    'round' => 2,
                ], 401);
            }

            // 3rd failure in Round 2 (6th failure overall): SUSPEND ACCOUNT!
            if ($user) {
                $user->update(['is_active' => false]);
                AuditService::log('user_suspended_login_failures', 'auth', $user, null, [
                    'email' => $email,
                    'reason' => 'Exceeded 6 failed login attempts across two rounds',
                ]);
            }

            Cache::put("login_suspended:{$email}", true, now()->addDays(30));

            return response()->json([
                'status' => 'account_suspended',
                'message' => 'Akun Anda telah ditangguhkan (suspended) karena gagal login 3 kali pada percobaan tahap kedua. Silakan hubungi Administrator untuk memulihkan akses Anda.',
            ], 403);
        }

        // 4. Successful login: Clear all failure caches
        Cache::forget("login_attempts:round1:{$email}");
        Cache::forget("login_lockout:round1:{$email}");
        Cache::forget("login_attempts:round2:{$email}");
        Cache::forget("login_round:{$email}");
        Cache::forget("login_suspended:{$email}");

        if ($user->two_factor_enabled) {
            $tempToken = $user->createToken('2fa_token', ['2fa'])->plainTextToken;

            return response()->json([
                'requires_2fa' => true,
                'token' => $tempToken,
            ]);
        }

        $newAccessToken = $user->createToken('api');
        $token = $newAccessToken->plainTextToken;
        $this->recordSessionTelemetry($newAccessToken->accessToken, $request);

        AuditService::log('login', 'auth', $user);

        // Load tenant / workspace automatically
        $user->load(['role.permissions', 'tenant']);
        $tenant = $user->tenant;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'workspace' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
            ] : null,
        ]);
    }

    /** POST /api/auth/send-otp — request email verification OTP for registration */
    public function sendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = strtolower(trim($request->email));

        if (User::where('email', $email)->exists()) {
            return response()->json(['message' => 'An account with this email already exists.'], 409);
        }

        // Rate-limit: one OTP per 60 seconds per email
        $recent = EmailVerificationOtp::where('email', $email)
            ->where('created_at', '>=', now()->subSeconds(60))
            ->exists();

        if ($recent) {
            return response()->json(['message' => 'Please wait before requesting another code.'], 429);
        }

        // Invalidate any prior unused OTPs for this email
        EmailVerificationOtp::where('email', $email)->whereNull('used_at')->delete();

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailVerificationOtp::create([
            'email' => $email,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
        ]);

        Mail::raw(
            "Your Leadsy verification code is: {$otp}\n\nThis code expires in 10 minutes.\nDo not share it with anyone.",
            function ($message) use ($email) {
                $message->to($email)->subject('Leadsy — Email Verification Code');
            }
        );

        return response()->json(['message' => 'Verification code sent. Please check your email.']);
    }

    /** POST /api/auth/register — create account after OTP verification */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => ['required', 'confirmed', SecuritySetting::resolve(null)->passwordRule()],
            'otp' => 'required|string|size:6',
        ]);

        $email = strtolower(trim($data['email']));

        $otpRecord = EmailVerificationOtp::where('email', $email)
            ->where('otp', $data['otp'])
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (! $otpRecord) {
            return response()->json(['message' => 'Invalid or expired verification code.'], 422);
        }

        // Mark OTP consumed
        $otpRecord->update(['used_at' => now()]);

        // Assign the default self-registration role (sales_exec)
        $defaultRole = Role::where('name', 'sales_exec')->first();

        $user = User::create([
            'name' => $data['name'],
            'email' => $email,
            'password' => $data['password'],
            'role_id' => $defaultRole?->id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $newAccessToken = $user->createToken('api');
        $token = $newAccessToken->plainTextToken;
        $this->recordSessionTelemetry($newAccessToken->accessToken, $request);

        AuditService::logCreated('users', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('role.permissions'),
        ], 201);
    }

    /** POST /api/auth/forgot-password/send-otp */
    public function sendPasswordResetOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();

        // Generate 6-digit numeric OTP
        $otp = (string) random_int(100000, 999999);
        \Illuminate\Support\Facades\Cache::put("pwd_reset_otp:{$email}", $otp, now()->addMinutes(10));

        \Illuminate\Support\Facades\Log::info("Password reset OTP for {$email}: {$otp}");

        // If user exists and email can be sent
        if ($user) {
            try {
                \Illuminate\Support\Facades\Mail::raw(
                    "Halo {$user->name},\n\nKode verifikasi OTP untuk reset kata sandi akun Leadsy Anda adalah: {$otp}\n\nKode ini berlaku selama 10 menit. Jangan berikan kode ini kepada siapapun demi keamanan akun Anda.\n\nSalam,\nTim Keamanan Leadsy",
                    function ($message) use ($email) {
                        $message->to($email)->subject('Kode Reset Kata Sandi Leadsy');
                    }
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Could not dispatch password reset email to {$email}: " . $e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Jika email {$email} terdaftar, kode verifikasi OTP 6-digit telah dikirimkan (berlaku 10 menit).",
            'debug_otp' => app()->environment(['local', 'testing']) ? $otp : null,
        ]);
    }

    /** POST /api/auth/forgot-password/verify-and-reset */
    public function verifyOtpAndResetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
            'password' => ['required', 'string', 'min:8', SecuritySetting::resolve(null)->passwordRule()],
        ]);

        $email = strtolower(trim($data['email']));
        $cachedOtp = \Illuminate\Support\Facades\Cache::get("pwd_reset_otp:{$email}");

        if (! $cachedOtp || $cachedOtp !== trim($data['otp'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kode OTP verifikasi tidak valid atau sudah kadaluarsa. Silakan minta kode baru.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun pengguna tidak ditemukan.',
            ], 404);
        }

        // Update password and activate user
        $user->update([
            'password' => $data['password'],
            'is_active' => true,
        ]);

        // Clear all lockout and suspension states for this email
        \Illuminate\Support\Facades\Cache::forget("login_attempts:round1:{$email}");
        \Illuminate\Support\Facades\Cache::forget("login_lockout:round1:{$email}");
        \Illuminate\Support\Facades\Cache::forget("login_attempts:round2:{$email}");
        \Illuminate\Support\Facades\Cache::forget("login_round:{$email}");
        \Illuminate\Support\Facades\Cache::forget("login_suspended:{$email}");
        \Illuminate\Support\Facades\Cache::forget("pwd_reset_otp:{$email}");

        AuditService::log('password_reset_via_otp', 'auth', $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
        ]);
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        AuditService::log('logout', 'auth', $request->user());

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out'])
            ->withoutCookie('virtuenet_sso_jwt', '/', '.virtuenet.space')
            ->withoutCookie('virtuenet_sso_jwt', '/');
    }

    /** GET /api/auth/me */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->load('role.permissions'),
        ]);
    }

    /** PUT /api/auth/password — self-service password change */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', SecuritySetting::resolve($user->tenant_id)->passwordRule()],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->update(['password' => $data['password']]);

        // Revoke every other session so a compromised session is fully
        // invalidated by a password change, keeping only the one making
        // this request.
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        AuditService::log('password_changed', 'auth', $user);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    /** GET /api/auth/lark/auth-url — Get Lark OAuth2 authorization URL */
    public function getLarkAuthUrl(Request $request): JsonResponse
    {
        $request->validate([
            'tenant_id' => 'nullable|exists:tenants,id',
        ]);

        try {
            if ($request->filled('tenant_id')) {
                $integration = LarkIntegration::where('tenant_id', $request->tenant_id)
                    ->where('is_active', true)
                    ->firstOrFail();
            } else {
                $integration = LarkIntegration::where('is_active', true)
                    ->orderBy('tenant_id')
                    ->firstOrFail();
            }

            if (! $integration->isModuleEnabled('sso')) {
                return response()->json([
                    'message' => 'Lark SSO is disabled for this workspace',
                ], 400);
            }

            $ssoService = new LarkSsoService($integration);
            $frontendUrl = env('FRONTEND_URL', env('NEXT_PUBLIC_APP_URL', config('app.url')));
            $redirectUri = rtrim($frontendUrl, '/').'/auth/lark/callback';

            $state = Str::random(48);
            Cache::put('lark_oauth_state:'.$state, [
                'tenant_id' => $integration->tenant_id,
                'redirect_uri' => $redirectUri,
            ], now()->addMinutes(10));

            $authUrl = $ssoService->getAuthorizationUrl(
                $redirectUri,
                $state,
                env('LARK_OAUTH_SCOPES', 'auth:user.id:read')
            );

            return response()->json([
                'auth_url' => $authUrl,
                'tenant_id' => $integration->tenant_id,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lark SSO not configured',
            ], 400);
        }
    }

    /** GET /api/auth/lark/tenants — List active Lark tenants */
    public function getLarkTenants(Request $request): JsonResponse
    {
        $tenants = Tenant::whereHas('larkIntegration', function ($query) {
            $query->where('is_active', true);
        })->get(['id', 'name', 'slug']);

        return response()->json([
            'data' => $tenants,
        ]);
    }

    /** POST /api/auth/lark/callback — Handle Lark OAuth2 callback */
    public function handleLarkCallback(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        try {
            $statePayload = Cache::pull('lark_oauth_state:'.$request->state);
            $tenantId = (int) ($statePayload['tenant_id'] ?? 0);

            if (! $statePayload || ! $tenantId) {
                return response()->json([
                    'message' => 'Invalid or expired Lark login state',
                ], 419);
            }

            $integration = LarkIntegration::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->firstOrFail();

            if (! $integration->isModuleEnabled('sso')) {
                return response()->json([
                    'message' => 'Lark SSO is disabled for this workspace',
                ], 400);
            }

            $tenant = Tenant::findOrFail($tenantId);
            $ssoService = new LarkSsoService($integration);

            $callbackResult = $ssoService->handleCallback($request->code, $statePayload['redirect_uri']);

            if (! $callbackResult || ! $callbackResult['success']) {
                return response()->json([
                    'message' => 'Failed to authenticate with Lark',
                ], 401);
            }

            $userInfo = $callbackResult['user_info'];

            // Create or update user from Lark info
            $user = $ssoService->createOrUpdateUserFromLark($userInfo, $tenant, 'sales_exec');

            // Generate token
            $newAccessToken = $user->createToken('api');
        $token = $newAccessToken->plainTextToken;
        $this->recordSessionTelemetry($newAccessToken->accessToken, $request);

            AuditService::log('login_via_lark_sso', 'auth', $user);

            return response()->json([
                'token' => $token,
                'user' => $user->load('role.permissions'),
            ]);
        } catch (\Exception $e) {
            Log::error('Lark SSO callback failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Lark authentication failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /** POST /api/auth/token/generate — Generate a long-lived API token */
    public function generateApiToken(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke any existing Integration_Token to ensure only one is active at a time
        $user->tokens()->where('name', 'Integration_Token')->delete();

        // Generate a new token
        $token = $user->createToken('Integration_Token')->plainTextToken;

        AuditService::log('generate_api_token', 'auth', $user);

        return response()->json([
            'token' => $token,
            'message' => 'Integration Token generated successfully.',
        ]);
    }

    /** GET /api/auth/token/status — Get the status of the active API token */
    public function getApiTokenStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->tokens()->where('name', 'Integration_Token')->latest()->first();

        if (!$token) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'name' => $token->name,
                'created_at' => $token->created_at,
                'last_used_at' => $token->last_used_at,
            ]
        ]);
    }

    private function recordSessionTelemetry($tokenModel, ?Request $request = null): void
    {
        if (! $tokenModel) {
            return;
        }

        /** @var \App\Services\Security\ClientTelemetryService $telemetryService */
        $telemetryService = app(\App\Services\Security\ClientTelemetryService::class);
        $telemetry = $telemetryService->captureFromRequest($request);

        $tokenModel->forceFill([
            'ip_address' => $telemetry['ip_address'],
            'user_agent' => $telemetry['user_agent'],
            'device_type' => $telemetry['device_type'],
            'browser' => $telemetry['browser'],
            'os' => $telemetry['os'],
            'city' => $telemetry['city'],
            'country_code' => $telemetry['country_code'],
            'country_name' => $telemetry['country_name'],
            'last_active_at' => now(),
        ])->save();
    }
}
