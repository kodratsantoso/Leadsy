<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FAQRCode\Google2FA;

class TwoFactorAuthController extends Controller
{
    /** POST /api/auth/login/2fa */
    public function verifyLogin(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();

        // Ensure the token being used has the '2fa' ability
        if (! $user->currentAccessToken()->can('2fa')) {
            return response()->json(['message' => 'Invalid token ability.'], 403);
        }

        if (! $user->two_factor_enabled || ! $user->two_factor_secret) {
            return response()->json(['message' => '2FA is not enabled.'], 400);
        }

        $code = $request->code;
        $google2fa = new Google2FA();
        
        $validOtp = $google2fa->verifyKey($user->two_factor_secret, $code);
        $validRecovery = false;

        // Check recovery codes if OTP is not valid
        if (! $validOtp && $user->two_factor_recovery_codes) {
            $recoveryCodes = $user->two_factor_recovery_codes;
            $index = array_search($code, $recoveryCodes);
            if ($index !== false) {
                $validRecovery = true;
                // Remove used recovery code
                unset($recoveryCodes[$index]);
                $user->update(['two_factor_recovery_codes' => array_values($recoveryCodes)]);
            }
        }

        if (! $validOtp && ! $validRecovery) {
            AuditService::logFailedLogin($user->email . ' (2FA failure)');
            return response()->json(['message' => 'Invalid authentication code.'], 401);
        }

        // Revoke the temporary 2FA token
        $user->currentAccessToken()->delete();

        // Issue the real API token
        $token = $user->createToken('api')->plainTextToken;

        AuditService::log('login', 'auth', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('role.permissions'),
        ]);
    }

    /** POST /api/auth/2fa/generate */
    public function generate(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if ($user->two_factor_enabled) {
            return response()->json(['message' => '2FA is already enabled.'], 400);
        }

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        
        // We do not save to DB yet, we return it to the frontend to render the QR code.
        // Wait, the frontend might not have a QR library.
        // It is safer to use the Google2FA package to generate the SVG string directly.
        $qrCodeSvg = $google2fa->getQRCodeInline(
            config('app.name', 'Leadsy'),
            $user->email,
            $secret
        );

        return response()->json([
            'secret' => $secret,
            'qr_code_svg' => $qrCodeSvg,
        ]);
    }

    /** POST /api/auth/2fa/enable */
    public function enable(Request $request): JsonResponse
    {
        $request->validate([
            'secret' => 'required|string',
            'code' => 'required|string',
        ]);

        $user = $request->user();
        
        if ($user->two_factor_enabled) {
            return response()->json(['message' => '2FA is already enabled.'], 400);
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($request->secret, $request->code);

        if (! $valid) {
            return response()->json(['message' => 'Invalid authentication code.'], 400);
        }

        // Generate 8 recovery codes
        $recoveryCodes = [];
        for ($i = 0; $i < 8; $i++) {
            $recoveryCodes[] = Str::random(10) . '-' . Str::random(10);
        }

        $user->update([
            'two_factor_secret' => $request->secret,
            'two_factor_enabled' => true,
            'two_factor_recovery_codes' => $recoveryCodes,
        ]);

        AuditService::log('enabled_2fa', 'security', $user);

        return response()->json([
            'message' => 'Two-Factor Authentication enabled successfully.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /** POST /api/auth/2fa/disable */
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $user = $request->user();
        
        if (! $user->two_factor_enabled) {
            return response()->json(['message' => '2FA is not enabled.'], 400);
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->two_factor_secret, $request->code);

        if (! $valid) {
            return response()->json(['message' => 'Invalid authentication code.'], 400);
        }

        $user->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
            'two_factor_recovery_codes' => null,
        ]);

        AuditService::log('disabled_2fa', 'security', $user);

        return response()->json([
            'message' => 'Two-Factor Authentication disabled successfully.',
        ]);
    }
}
