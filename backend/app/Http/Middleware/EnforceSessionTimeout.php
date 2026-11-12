<?php

namespace App\Http\Middleware;

use App\Models\SecuritySetting;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces an idle-timeout on Sanctum personal access tokens, configured via
 * Settings > Security > Session Timeout.
 *
 * Must run BEFORE the `auth:sanctum` middleware in the route pipeline: Sanctum's
 * own guard overwrites `last_used_at` to now() the moment it resolves the token,
 * so checking it AFTER that point would always see "just now" and never expire
 * anything. Reading the token here first, ourselves, sees the value as of the
 * *previous* request — the actual last-activity timestamp we need to compare
 * against the configured timeout.
 *
 * When session_timeout_minutes is null (the default), this is a total no-op —
 * nothing changes for anyone until an admin explicitly sets a timeout value.
 */
class EnforceSessionTimeout
{
    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if (! $bearerToken) {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);

        if (! $accessToken || $accessToken->name === 'Integration_Token') {
            return $next($request);
        }

        // Touch last_active_at and refresh client telemetry periodically (at most once every 2 mins to avoid DB churn)
        $lastTouch = $accessToken->last_active_at;
        if (! $lastTouch || $lastTouch->diffInMinutes(now()) >= 2 || ! $accessToken->ip_address) {
            $telemetry = app(\App\Services\Security\ClientTelemetryService::class)->captureFromRequest($request);
            $accessToken->forceFill([
                'last_active_at' => now(),
                'ip_address' => $telemetry['ip_address'],
                'user_agent' => $telemetry['user_agent'],
                'device_type' => $telemetry['device_type'],
                'browser' => $telemetry['browser'],
                'os' => $telemetry['os'],
                'city' => $telemetry['city'],
                'country_code' => $telemetry['country_code'],
                'country_name' => $telemetry['country_name'],
            ])->save();
        }

        $user = $accessToken->tokenable;
        $setting = SecuritySetting::resolve($user?->tenant_id);

        if (! $setting->session_timeout_minutes) {
            return $next($request);
        }

        $lastActivity = $accessToken->last_used_at ?? $accessToken->created_at;
        $cutoff = now()->subMinutes($setting->session_timeout_minutes);

        if ($lastActivity && $lastActivity->lt($cutoff)) {
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your session has expired due to inactivity. Please sign in again.',
                'error' => ['code' => 'SESSION_TIMEOUT'],
            ], 401);
        }

        return $next($request);
    }
}
