<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PersonalAccessToken;
use App\Models\SecuritySetting;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Security\ClientTelemetryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionManagementController extends Controller
{
    /**
     * List active and idle sessions for the current tenant or platform.
     */
    public function index(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->isSuperAdmin();

        $query = PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->where('name', '!=', '2fa_token'); // Exclude ephemeral 2fa transition tokens

        if (! $isSuperAdmin || ! $request->boolean('all')) {
            $tenantId = $isSuperAdmin && $request->filled('tenant_id')
                ? (int) $request->tenant_id
                : (int) $currentUser->tenant_id;

            $userIds = User::where('tenant_id', $tenantId)->pluck('id');
            $query->whereIn('tokenable_id', $userIds);
        }

        $tokens = $query->with(['user.role', 'user.tenant'])
            ->orderByRaw('COALESCE(last_active_at, last_used_at, created_at) DESC')
            ->get();

        $currentAccessToken = $currentUser->currentAccessToken();
        $currentTokenId = ($currentAccessToken instanceof PersonalAccessToken || isset($currentAccessToken->id))
            ? $currentAccessToken->id
            : null;

        $setting = SecuritySetting::resolve($currentUser->tenant_id);
        $idleThreshold = $setting->session_timeout_minutes ?: 15;

        /** @var ClientTelemetryService $telemetryService */
        $telemetryService = app(ClientTelemetryService::class);

        $mapped = $tokens->map(function (PersonalAccessToken $token) use ($currentTokenId, $idleThreshold, $telemetryService) {
            $user = $token->user;
            $lastActivity = $token->last_active_at ?? $token->last_used_at ?? $token->created_at;
            $idleMinutes = $lastActivity ? (int) $lastActivity->diffInMinutes(now()) : 0;
            $isIdle = $idleMinutes >= $idleThreshold;

            $countryCode = $token->country_code ?: 'ID';
            $flag = $token->country_code ? $telemetryService->countryCodeToEmoji($token->country_code) : '🇮🇩';

            return [
                'id' => $token->id,
                'name' => $token->name,
                'is_current_device' => $currentTokenId === $token->id,
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url,
                    'role' => $user->role?->name ?? 'member',
                    'role_label' => $user->role?->display_name ?? ucfirst($user->role?->name ?? 'Member'),
                    'tenant_id' => $user->tenant_id,
                    'tenant_name' => $user->tenant?->name,
                ] : null,
                'client' => [
                    'device_type' => $token->device_type ?: 'desktop',
                    'browser' => $token->browser ?: 'Browser',
                    'os' => $token->os ?: 'Unknown OS',
                    'user_agent' => $token->user_agent,
                ],
                'location' => [
                    'ip_address' => $token->ip_address ?: '127.0.0.1',
                    'city' => $token->city ?: 'Jakarta',
                    'country_code' => $countryCode,
                    'country_name' => $token->country_name ?: 'Indonesia',
                    'flag' => $flag,
                ],
                'activity' => [
                    'created_at' => $token->created_at?->toISOString(),
                    'last_active_at' => $lastActivity?->toISOString(),
                    'idle_minutes' => $idleMinutes,
                    'status' => $isIdle ? 'idle' : 'active',
                    'is_idle' => $isIdle,
                ],
            ];
        });

        $activeCount = $mapped->where('activity.status', 'active')->count();
        $idleCount = $mapped->where('activity.status', 'idle')->count();
        $uniqueUsers = $mapped->pluck('user.id')->filter()->unique()->count();
        $uniqueLocations = $mapped->pluck('location.city')->filter()->unique()->count();

        return response()->json([
            'success' => true,
            'data' => $mapped->values(),
            'summary' => [
                'total_sessions' => $mapped->count(),
                'active_sessions' => $activeCount,
                'idle_sessions' => $idleCount,
                'unique_users_count' => $uniqueUsers,
                'locations_count' => max(1, $uniqueLocations),
                'idle_threshold_minutes' => $idleThreshold,
            ],
        ]);
    }

    /**
     * Terminate / force-logout a specific session.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();
        $token = PersonalAccessToken::findOrFail($id);
        $targetUser = User::find($token->tokenable_id);

        // Security authorization check: Non-superadmins can only terminate sessions within their tenant
        if (! $currentUser->isSuperAdmin()) {
            if (! $targetUser || (int) $targetUser->tenant_id !== (int) $currentUser->tenant_id) {
                abort(403, 'Unauthorized. You cannot terminate sessions outside your organization.');
            }
        }

        $targetEmail = $targetUser?->email ?? 'unknown';
        $token->delete();

        AuditService::logSessionTerminated(
            targetUserId: (int) ($targetUser?->id ?? 0),
            targetEmail: $targetEmail,
            reason: 'Remotely terminated by ' . $currentUser->name . ' (' . $currentUser->email . ')'
        );

        return response()->json([
            'success' => true,
            'message' => "Sesi untuk {$targetEmail} berhasil diputus (remote logout).",
        ]);
    }

    /**
     * Bulk terminate all idle sessions for the tenant.
     */
    public function terminateIdle(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $setting = SecuritySetting::resolve($currentUser->tenant_id);
        $idleThreshold = $setting->session_timeout_minutes ?: 15;
        $cutoff = now()->subMinutes($idleThreshold);

        $currentAccessToken = $currentUser->currentAccessToken();
        $currentTokenId = ($currentAccessToken instanceof PersonalAccessToken || isset($currentAccessToken->id))
            ? $currentAccessToken->id
            : null;

        $query = PersonalAccessToken::where('tokenable_type', User::class)
            ->where('name', '!=', 'Integration_Token')
            ->when($currentTokenId, function ($q) use ($currentTokenId) {
                $q->where('id', '!=', $currentTokenId);
            })
            ->where(function ($q) use ($cutoff) {
                $q->where('last_active_at', '<', $cutoff)
                    ->orWhere(function ($sub) use ($cutoff) {
                        $sub->whereNull('last_active_at')
                            ->where('created_at', '<', $cutoff);
                    });
            });

        if (! $currentUser->isSuperAdmin()) {
            $userIds = User::where('tenant_id', $currentUser->tenant_id)->pluck('id');
            $query->whereIn('tokenable_id', $userIds);
        }

        $idleTokens = $query->get();
        $count = $idleTokens->count();

        if ($count > 0) {
            $query->delete();
            AuditService::logIdleSessionsPurged($count, (int) $currentUser->tenant_id);
        }

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => $count > 0
                ? "{$count} sesi idle berhasil di-logout secara otomatis."
                : "Tidak ada sesi idle yang perlu dibersihkan saat ini.",
        ]);
    }
}
