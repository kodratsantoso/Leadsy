<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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
            'user'  => $user->load('role'),
        ]);
    }

    /** POST /api/auth/register */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role_id'  => 'nullable|exists:roles,id',
            'phone'    => 'nullable|string|max:30',
        ]);

        $user = User::create($data);
        $token = $user->createToken('api')->plainTextToken;

        AuditService::logCreated('users', $user);

        return response()->json([
            'token' => $token,
            'user'  => $user->load('role'),
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
