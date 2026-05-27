<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationOtp;
use App\Models\LarkIntegration;
use App\Models\Role;
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
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            AuditService::logFailedLogin($request->email);

            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Account deactivated'], 403);
        }

        $token = $user->createToken('api')->plainTextToken;

        AuditService::log('login', 'auth', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('role.permissions'),
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
            'password' => ['required', 'confirmed', Password::defaults()],
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

        $token = $user->createToken('api')->plainTextToken;

        AuditService::logCreated('users', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('role.permissions'),
        ], 201);
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        AuditService::log('logout', 'auth', $request->user());

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    /** GET /api/auth/me */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->load('role.permissions'),
        ]);
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
            $token = $user->createToken('api')->plainTextToken;

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
}
