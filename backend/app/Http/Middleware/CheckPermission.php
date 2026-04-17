<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RBAC Permission Middleware — BRD §5.1
 *
 * Usage in routes:
 *   ->middleware('permission:leads.view')
 *   ->middleware('permission:leads.create,leads.edit')  // any of
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Super admins bypass
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has ANY of the required permissions
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        // Parse module from the first segment of the route path
        $module = explode('/', $request->path())[1] ?? 'system';
        \App\Services\AuditService::logAccessDenied($module, $permissions);

        return response()->json([
            'message'     => 'Forbidden: insufficient permissions',
            'required'    => $permissions,
        ], 403);
    }
}
