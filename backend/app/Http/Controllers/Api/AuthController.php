<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationOtp;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
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
            'user'  => $user->load('role.permissions'),
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
            'email'      => $email,
            'otp'        => $otp,
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
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:users',
            'password'              => ['required', 'confirmed', Password::defaults()],
            'otp'                   => 'required|string|size:6',
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
            'name'              => $data['name'],
            'email'             => $email,
            'password'          => $data['password'],
            'role_id'           => $defaultRole?->id,
            'is_active'         => true,
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken('api')->plainTextToken;

        AuditService::logCreated('users', $user);

        return response()->json([
            'token' => $token,
            'user'  => $user->load('role.permissions'),
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
}
